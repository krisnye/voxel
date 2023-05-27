import { Volume } from "../../data/Volume.js";
import { X, Y, Z } from "../../math/types.js";
import { VoxelMaterial } from "../VoxelMaterial.js";

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
    materials: VoxelMaterial[],
) {
    const materialFrom = materials[materialIdFrom];
    const materialTo = materials[materialIdTo];
    if (!materialFrom.mass || !materialTo.mass) {
        return 0.0;
    }
    const thermalResistance = 1.0 / (1.0 / materialFrom.thermalResistance + 1.0 / materialTo.thermalResistance);
    //  heat transfer is directly proportional to the temperature difference.
    const temperatureDifference = temperatureFrom - temperatureTo;
    //  heat transfer is inversely proportional to thermal resistance.
    const heatTransferRate = temperatureDifference / thermalResistance;
    return heatTransferRate;
}

export function calculateHeat(
    volume: Volume<{
        material: Uint8Array,
        temperature: Float32Array,
        heat: Float32Array
    }>,
    materials: VoxelMaterial[]
) {
    const { size, data: { material, temperature, heat } } = volume;

    console.log("Calculate Heat Transfer", size);

    let index = 0;
    for (let z = 0; z < size[Z]; z++) {
        for (let y = 0; y < size[Y]; y++) {
            for (let x = 0; x < size[X]; x++) {
                const materialIdTo = material[index];
                const temperatureTo = temperature[index];
                let totalHeat = 0.0;
                if (x > 0) {
                    const fromIndex = index - 1;
                    totalHeat += calculateVoxelHeat(material[fromIndex], temperature[fromIndex], materialIdTo, temperatureTo, materials);
                }
                if (x + 1 < size[X]) {
                    const fromIndex = index + 1;
                    totalHeat += calculateVoxelHeat(material[fromIndex], temperature[fromIndex], materialIdTo, temperatureTo, materials);
                }
                if (y > 0) {
                    const fromIndex = index - size[X];
                    totalHeat += calculateVoxelHeat(material[fromIndex], temperature[fromIndex], materialIdTo, temperatureTo, materials);
                }
                if (y + 1 < size[Y]) {
                    const fromIndex = index + size[X];
                    totalHeat += calculateVoxelHeat(material[fromIndex], temperature[fromIndex], materialIdTo, temperatureTo, materials);
                }
                if (z > 0) {
                    const fromIndex = index - size[X] * size[Y];
                    totalHeat += calculateVoxelHeat(material[fromIndex], temperature[fromIndex], materialIdTo, temperatureTo, materials);
                }
                if (z + 1 < size[Z]) {
                    const fromIndex = index + size[X] * size[Y];
                    totalHeat += calculateVoxelHeat(material[fromIndex], temperature[fromIndex], materialIdTo, temperatureTo, materials);
                }
                // finally, write the total heat output
                heat[index] = totalHeat;
                index++;    //  we know we are iterating in linear manner by using z, y, x for loops
            }
        }
    }

    // traverse all the things.
    // console.log(volume, materials);
}

//  delta dx, dy, dz
