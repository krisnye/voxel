import { Vector3 } from "../math/types";

/**
 * I31: RGB or ARGB
 */
export type Color = number;

/**
 * F32: Kelvin
 */
export type Temperature = number;

/**
 * F32: g/cm3
 */
export type Density = number;

/**
 * F32: Pascals, kg/ms2
 */
export type Pressure = number;

/**
 * HDR Lighting components, units not specified yet.
 */
export type Light = Vector3;

/**
 * F32: Watts / Meter Kelvin
 */
export type ThermalConductivity = number;

/**
 * F32: Joules / Gram Kelvin
 */
export type SpecificHeatCapacity = number;

/**
 * Represents the properties of a material at a specific temperature and pressure.
 */
export interface MaterialProperties {
    color: Color;
    emission: Light;
}

export enum Phase {
    solid = 0,
    liquid = 1,
    gas = 2,
    plasma = 3,
}

export interface Material {

    phase: Phase;
    density?: Density;
    specificHeatCapacity: SpecificHeatCapacity;
    thermalConductivity: ThermalConductivity;

}
