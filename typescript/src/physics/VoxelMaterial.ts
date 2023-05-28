import { Distance, Mass, Material, Type } from "./types.js";

//  Watts / Kelvin
export type VoxelConductivity = number;

//  Joules / Kelvin
export type VoxelHeatCapacity = number;

export interface VoxelMaterial {
    mass?: Mass;
    thermalResistance: VoxelConductivity;
    heatCapacity: VoxelHeatCapacity;
}

function toVoxelMaterial(m: Material, length: Distance): VoxelMaterial {
    const volume = length * length * length;
    switch (m.type) {
        case Type.gas:
            return { thermalResistance: 0, heatCapacity: 0};
        case Type.solid:
        case Type.grain:
        case Type.liquid:
            const mass = m.density * volume;
            //  see heatTranfer.ts
            const thermalResistance = 1.0 / ( 2.0 * m.thermalConductivity * length );
            return {
                mass,
                thermalResistance,
                heatCapacity: mass * m.specificHeatCapacity
            };
    }
}

export function toVoxelMaterials(materials: Material[], length: Distance): VoxelMaterial[] {
    return materials.map(material => toVoxelMaterial(material, length));
}