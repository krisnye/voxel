import { TypedArrayConstructor } from "./TypedArray.js";

export interface Primitive {
    min: number,
    max: number,
    bits: number,
    arrayType?: TypedArrayConstructor;
    gpuType?: string;
}

export const bitsToBytes = ( bits: number ) => Math.ceil( bits / 8 );

export interface Types {
    u8: number
    u16: number
    u32: number
    i32: number
    f16: number
    f32: number
    f64: number
}

export type TypeId = keyof Types;

export type TypeDescriptor = Primitive;

export const typeDescriptors = {
    u8: { min: 0, max: 0xFF, bits: 8, arrayType: Uint8Array },
    u16: { min: 0, max: 0xFFFF, bits: 16, arrayType: Uint16Array },
    u32: { min: 0, max: 0xFFFFFFFF, bits: 32, arrayType: Uint32Array, gpuType: "u32" },
    i32: { min: -2147483648, max: 2147483647, bits: 32, arrayType: Int32Array, gpuType: "i32" },
    f16: { min: Number.MIN_VALUE, max: Number.MAX_VALUE, bits: 16, gpuType: "f16" },
    f32: { min: Number.MIN_VALUE, max: Number.MAX_VALUE, bits: 32, arrayType: Float32Array, gpuType: "f32" },
    f64: { min: Number.MIN_VALUE, max: Number.MAX_VALUE, bits: 64, arrayType: Float64Array },
} as const satisfies { [ name in TypeId ]: TypeDescriptor };
type TypeDescriptors = typeof typeDescriptors;

/**
 * Types with TypedArray classes for their elements.
 */
export type TypedArrayElementTypeId = "u8" | "u16" | "u32" | "i32" | "f32" | "f64";
/**
 * Valid GPU scalar data types.
 */
export type GPUTypeId = "u32" | "i32" | "f16" | "f32";
/**
 * GPUTypes which also have a valid TypedArray.
 */
export type TypedArrayElementGPUTypeId = TypedArrayElementTypeId & GPUTypeId;

export type ArrayType<T extends TypedArrayElementTypeId> = InstanceType<TypeDescriptors[ T ][ "arrayType" ]>;