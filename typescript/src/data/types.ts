
export type StringKeyOf<T extends object> = Extract<keyof T, string>;

export type TypedArray = Uint8Array | Uint16Array | Uint32Array | Float32Array | Float64Array;

export type TypedArrayConstructor = new ( length: number ) => TypedArray;

export type TypedData = { [ name: string ]: TypedArray }
