import { Volume } from "../data/Volume.js";
import { Distance, Material, MaterialId, Type } from "./types.js";

//  Watts / Kelvin
export type VoxelThermalResistance = number;

//  Joules / Kelvin
export type VoxelHeatCapacity = number;

export type VoxelMaterial = Array<number> & { length: 3 } & { [ key in MaterialProperty ]: number };
export enum MaterialProperty {
    mass = 0,
    thermalResistance = 1,
    heatCapacity = 2,
}
export type MaterialLookup = Volume<{ lookup: "f32" }>;

function toVoxelMaterial( m: Material, length: Distance ): VoxelMaterial {
    const volume = length * length * length;
    let mass: number, thermalResistance: number, heatCapacity: number;
    switch ( m.type ) {
        case Type.gas:
            mass = thermalResistance = heatCapacity = 0.0;
            break;
        case Type.solid:
        case Type.grain:
        case Type.liquid:
            mass = m.density * volume;
            console.log( { mass, density: m.density, volume, length } );
            //  see heatTranfer.ts
            thermalResistance = 1.0 / ( 2.0 * m.thermalConductivity * length );
            heatCapacity = mass * m.specificHeatCapacity;
            break;
    }
    return [ mass, thermalResistance, heatCapacity ];
}

export function toVoxelMaterialLookupVolume( materials: Material[], length: Distance ): MaterialLookup {
    const values = materials.map( material => toVoxelMaterial( material, length ) ).flat();
    return Volume.create( [ 3, materials.length, 1 ], { lookup: "f32" }, { lookup: new Float32Array( values ) } );
}

export function getMaterialProperty( materials: MaterialLookup, type: MaterialId, property: MaterialProperty ) {
    const index = materials.index( property, type, 0 );
    return materials.data.lookup[ index ];
}