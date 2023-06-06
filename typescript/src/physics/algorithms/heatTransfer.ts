import { Volume } from "../../data/Volume.js";
import { X, Y, Z } from "../../math/types.js";
import { MaterialLookup, MaterialProperty, VoxelMaterial, getMaterialProperty } from "../VoxelMaterial.js";
import { Time } from "../types.js";

//  https://www.khanacademy.org/science/physics/thermodynamics/specific-heat-and-heat-transfer/a/what-is-thermal-conductivity
//  
//  heat transfer equation
//  Q / t ​= k A ΔT​ / d
//
//  Q = Heat Energy
//  t = time
//  k = thermal conductivity constant for material
//  A = area of contact
//  ΔT = difference in temperature (read delta T)
//  d = distance
//
//  r = thermal resistance
//  we can precalculate this for each voxel material knowing it's size
//  r = d / A k
//  vs = voxel side length
//  d = vs / 2
//  A = vs ^ 2
//  d / A = 1 / (2 vs)
//  r = 1 / (2 vs k)

// calculate the heat transfer from 0 to 1
function calculateVoxelHeat(
    materialIdFrom: number,
    temperatureFrom: number,
    materialIdTo: number,
    temperatureTo: number,
    materials: MaterialLookup,
) {
    const materialFromMass = getMaterialProperty( materials, materialIdFrom, MaterialProperty.mass );
    const materialToMass = getMaterialProperty( materials, materialIdTo, MaterialProperty.mass );
    if ( materialFromMass === 0.0 || materialToMass === 0.0 ) {
        return 0.0;
    }
    const materialFromThermalResistance = getMaterialProperty( materials, materialIdFrom, MaterialProperty.thermalResistance );
    const materialToThermalResistance = getMaterialProperty( materials, materialIdTo, MaterialProperty.thermalResistance );
    //  resistance in series.
    const thermalResistance = materialFromThermalResistance + materialToThermalResistance;
    //  heat transfer is directly proportional to the temperature difference.
    const temperatureDifference = temperatureFrom - temperatureTo;
    //  heat transfer is inversely proportional to thermal resistance.
    const heatTransferRate = temperatureDifference / thermalResistance;
    return heatTransferRate;
}

export function calculateHeat(
    volume: Volume<{
        //  read
        material: "u32",
        temperature: "f32",
        //  write
        heat: "f32"
    }>,
    materials: MaterialLookup
) {
    const { size, data: { material, temperature, heat } } = volume;

    let index = 0;
    for ( let z = 0; z < size[ Z ]; z++ ) {
        for ( let y = 0; y < size[ Y ]; y++ ) {
            for ( let x = 0; x < size[ X ]; x++ ) {
                const materialIdTo = material[ index ];
                const temperatureTo = temperature[ index ];
                let totalHeat = 0.0;
                if ( x > 0 ) {
                    const fromIndex = index - 1;
                    totalHeat += calculateVoxelHeat( material[ fromIndex ], temperature[ fromIndex ], materialIdTo, temperatureTo, materials );
                }
                if ( x + 1 < size[ X ] ) {
                    const fromIndex = index + 1;
                    totalHeat += calculateVoxelHeat( material[ fromIndex ], temperature[ fromIndex ], materialIdTo, temperatureTo, materials );
                }
                if ( y > 0 ) {
                    const fromIndex = index - size[ X ];
                    totalHeat += calculateVoxelHeat( material[ fromIndex ], temperature[ fromIndex ], materialIdTo, temperatureTo, materials );
                }
                if ( y + 1 < size[ Y ] ) {
                    const fromIndex = index + size[ X ];
                    totalHeat += calculateVoxelHeat( material[ fromIndex ], temperature[ fromIndex ], materialIdTo, temperatureTo, materials );
                }
                if ( z > 0 ) {
                    const fromIndex = index - size[ X ] * size[ Y ];
                    totalHeat += calculateVoxelHeat( material[ fromIndex ], temperature[ fromIndex ], materialIdTo, temperatureTo, materials );
                }
                if ( z + 1 < size[ Z ] ) {
                    const fromIndex = index + size[ X ] * size[ Y ];
                    totalHeat += calculateVoxelHeat( material[ fromIndex ], temperature[ fromIndex ], materialIdTo, temperatureTo, materials );
                }
                // finally, write the total heat output
                heat[ index ] = totalHeat;
                index++;    //  we know we are iterating in linear manner by using z, y, x for loops
            }
        }
    }

    // traverse all the things.
    // console.log(volume, materials);
}

//  Heat = Energy in Watts
//  Watts = Power in Joules / Second
//  Energy in Joules
export function applyHeat(
    volume: Volume<{
        //  read
        material: "u32",
        heat: "f32"
        //  write
        temperature: "f32",
    }>,
    materials: MaterialLookup,
    time: Time,
) {
    const { data: { material, temperature, heat } } = volume;
    const length = volume.data.material.length;
    // this is completely parallelizable.
    for ( let i = 0; i < length; i++ ) {
        const materialMass = getMaterialProperty( materials, material[ i ], MaterialProperty.mass );
        if ( materialMass === 0.0 ) {
            continue;
        }
        const voxelHeatCapacity = getMaterialProperty( materials, material[ i ], MaterialProperty.heatCapacity );
        const voxelHeat = heat[ i ];
        //  heat is power, power * time = energy
        const heatEnergy = voxelHeat * time;
        //  energy / heatCapacity = temperature change in kelvin
        const temperatureChange = heatEnergy / voxelHeatCapacity;
        temperature[ i ] += temperatureChange;
    }
}

export function totalHeatEnergy(
    volume: Volume<{
        //  read
        material: "u8",
        temperature: "f32",
    }>,
    materials: MaterialLookup,
) {
    const { data: { material, temperature } } = volume;
    const length = volume.data.material.length;
    let total = 0.0;
    for ( let i = 0; i < length; i++ ) {
        const materialMass = getMaterialProperty( materials, material[ i ], MaterialProperty.mass );
        if ( materialMass === 0.0 ) {
            continue;
        }
        const voxelHeatCapacity = getMaterialProperty( materials, material[ i ], MaterialProperty.heatCapacity );
        if ( !Number.isFinite( voxelHeatCapacity ) ) {
            continue;
        }
        total += voxelHeatCapacity * temperature[ i ];
    }
    return total;
}