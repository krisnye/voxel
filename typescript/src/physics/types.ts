import { Vector3 } from "../math/types";

/**
 * F32: Meter
 */
export type Distance = number;

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
 * F32: Kg
 */
export type Mass = number;

/**
 * F32: ?
 */
 export type Viscosity = number;

/**
 * HDR Lighting components, units not specified yet.
 */
export type Light = Vector3;

/**
 * F32: Watts / Meter Kelvin
 */
export type ThermalConductivity = number;

/**
 * F32: Joules / Kg Kelvin
 */
export type SpecificHeatCapacity = number;

/**
 * F32: Joules / Second
 */
export type Power = number;

/**
 * Represents the properties of a material at a specific temperature and pressure.
 */
export interface MaterialProperties {
    color: Color;
    emission: Light;
}

/**
 * F32: Seconds
 */
export type Time = number;

export enum Type {
    solid = 0,
    grain = 1,
    liquid = 2,
    gas = 3,
}

export interface BaseMaterial {
    id: MaterialId;
    type: Type;
    specificHeatCapacity: SpecificHeatCapacity;
    thermalConductivity: ThermalConductivity;
}

export interface SolidMaterial extends BaseMaterial {
    type: Type.solid;
    density: Density;
}

export interface GrainMaterial extends BaseMaterial {
    type: Type.grain;
    density: Density;
}

export interface LiquidMaterial extends BaseMaterial {
    type: Type.liquid;
    density: Density;
    viscosity: Viscosity;
}

export interface GasMaterial extends BaseMaterial {
    type: Type.gas;
}

export type Material = SolidMaterial | GrainMaterial | LiquidMaterial | GasMaterial;

export type MaterialId = number;

//  experimental type
export interface Block {
    type: Type; //  2 bits
}

export interface SolidBlock {
    material: MaterialId     //  8 bits

    //  miscelaneous bits?
    bondX: boolean;             //  1 bit
    bondY: boolean;             //  1 bit
    bondZ: boolean;             //  1 bit
    //  5 spare bits? Dirtyness or some visual effect?

    temperature: Temperature;   //  16 bits
    heat: Power;                //  16 bits

    pressureX: Pressure;        //  16 bits
    pressureY: Pressure;        //  16 bits
    pressureZ: Pressure;        //  16 bits
}

//  passes
//      heat calculation    => (material, temperature)  -> heat
//      heat transfer       => (material, heat) -> temperature
//      pressure transfer   => material, pressure
