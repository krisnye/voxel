import { TypedArrayConstructor } from "./TypedArray";

export interface Primitive {
    min: number,
    max: number,
    bits: number,
    arrayType?: TypedArrayConstructor;
    gpuType?: string;
}

export type ArrayTypePrimitive = Primitive & { arrayType: TypedArrayConstructor };
export type GPUPrimitive = Primitive & { gpuType: string };

export const U8 = { min: 0, max: 0xFF, bits: 8, arrayType: Uint8Array } as const satisfies Primitive;
export const U16 = { min: 0, max: 0xFFFF, bits: 16, arrayType: Uint16Array } as const satisfies Primitive;
export const U32 = { min: 0, max: 0xFFFFFFFF, bits: 32, arrayType: Uint32Array, gpuType: "u32" } as const satisfies Primitive;
export const I32 = { min: -2147483648, max: 2147483647, bits: 32, arrayType: Int32Array, gpuType: "i32" } as const satisfies Primitive;
export const F16 = { min: Number.MIN_VALUE, max: Number.MAX_VALUE, bits: 16, gpuType: "f16" } as const satisfies Primitive;
export const F32 = { min: Number.MIN_VALUE, max: Number.MAX_VALUE, bits: 32, arrayType: Float32Array, gpuType: "f32" } as const satisfies Primitive;
export const F64 = { min: Number.MIN_VALUE, max: Number.MAX_VALUE, bits: 64, arrayType: Float64Array } as const satisfies Primitive;

export const bitsToBytes = ( bits: number ) => Math.ceil( bits / 8 );

