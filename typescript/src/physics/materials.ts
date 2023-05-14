import { Material, Phase } from "./types";

export const materials = {
    water: { phase: Phase.liquid, thermalConductivity: 1.0, specificHeatCapacity: 4.1813, density: 1.0 },
    ice: { phase: Phase.solid, thermalConductivity: 1.0, specificHeatCapacity: 2.05, density: 1.0 },
    iron: { phase: Phase.solid, thermalConductivity: 1.0, specificHeatCapacity: 0.44, density: 7.874 },
    stone: { phase: Phase.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
    dirt: { phase: Phase.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
    wood: { phase: Phase.solid, thermalConductivity: 1.0, specificHeatCapacity: 1.0, density: 1.0 },
    air: { phase: Phase.gas, thermalConductivity: 1.0, specificHeatCapacity: 1.0 },

} as const satisfies Record<string,Material>;
