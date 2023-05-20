import { Material, Type } from "./types";

export const material = {
    water: { type: Type.liquid, thermalConductivity: 1.0, specificHeatCapacity: 4.1813, density: 1.0, viscosity: 1.0 },
    ice: { type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 2.05, density: 1.0 },
    iron: { type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 0.44, density: 7.874 },
    stone: { type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
    dirt: { type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
    wood: { type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
    air: { type: Type.gas, thermalConductivity: 1.0, specificHeatCapacity: 1.0 },
} as const satisfies Record<string,Material>;

export const materials: Material[] = Object.values(material);
