import { Material, Type } from "./types.js";

//  thermal conductivity
//  https://www.myengineeringtools.com/Data_Diagrams/Chemical_Compound_Thermal_Conductivity.html
//  specific heat capacity
//  https://material-properties.org/heat-capacity-of-materials/
//  density
//  https://material-properties.org/density-of-materials/
const material = {
    air: { id: -1, type: Type.gas, thermalConductivity: 0.024, specificHeatCapacity: 1006 },
    water: { id: -1, type: Type.liquid, thermalConductivity: 0.66, specificHeatCapacity: 4200, density: 0.997, viscosity: 1.0 },
    //  rock thermal conductivity varies, 2 - 7
    rock: { id: -1, type: Type.solid, thermalConductivity: 4.0, specificHeatCapacity: 800, density: 2.65 },
    ice: { id: -1, type: Type.solid, thermalConductivity: 2.18, specificHeatCapacity: 2040, density: 0.997 },
    iron: { id: -1, type: Type.solid, thermalConductivity: 50, specificHeatCapacity: 460, density: 7.874 },
    dirt: { id: -1, type: Type.solid, thermalConductivity: 0.25, specificHeatCapacity: 800, density: 1.51 },
    sand: { id: -1, type: Type.grain, thermalConductivity: 0.2, specificHeatCapacity: 830, density: 2.1 },
    woodHard: { id: -1, type: Type.solid, thermalConductivity: 0.16, specificHeatCapacity: 2000, density: 0.65 },
    woodSoft: { id: -1, type: Type.solid, thermalConductivity: 0.12, specificHeatCapacity: 2300, density: 0.49 },
} as const satisfies { [name: string]: Material };

// assign correct id values to each material
Object.values(material).forEach((item: Material, index: number) => { item.id = index; })

export const materials: Material[] & typeof material = Object.assign(Object.values(material), material);
