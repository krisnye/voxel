import { Distance, Mass, Material, Type } from "./types.js";

//  Watts / Kelvin
export type VoxelConductivity = number;

//  Joules / Kelvin
export type VoxelHeatCapacity = number;

export interface VoxelMaterial {
    mass?: Mass;
    conductivity: VoxelConductivity;
    heatCapacity: VoxelHeatCapacity;
}

function toVoxelMaterial(m: Material, length: Distance): VoxelMaterial {
    const volume = length * length * length;
    switch (m.type) {
        case Type.gas:
            return { conductivity: 0, heatCapacity: 0};
        case Type.solid:
        case Type.grain:
        case Type.liquid:
            const mass = m.density * volume;
            return {
                mass,
                conductivity: m.thermalConductivity * length / 2,
                heatCapacity: mass * m.specificHeatCapacity
            };
    }
}

export function toVoxelMaterials(materials: Material[], length: Distance): VoxelMaterial[] {
    return materials.map(material => toVoxelMaterial(material, length));
}