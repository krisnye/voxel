import { Material, Type } from "./types.js";

const material = {
    air: { id: -1, type: Type.gas, thermalConductivity: 1.0, specificHeatCapacity: 1.0 },
    water: { id: -1, type: Type.liquid, thermalConductivity: 1.0, specificHeatCapacity: 4.1813, density: 1.0, viscosity: 1.0 },
    rock: { id: -1, type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
    ice: { id: -1, type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 2.05, density: 1.0 },
    iron: { id: -1, type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 0.44, density: 7.874 },
    dirt: { id: -1, type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
    wood: { id: -1, type: Type.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
} as const satisfies { [name: string]: Material };

// assign correct id values to each material
Object.values(material).forEach((item: Material, index: number) => { item.id = index; })

export const materials: Material[] & typeof material = Object.assign(Object.values(material), material);
