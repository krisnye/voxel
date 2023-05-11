
export class Primitive<T extends number | bigint> {

    public readonly bits: number;

    constructor(public readonly min: T, public readonly max: T, bits?: number) {
        // TODO: infer bits here based upon integer range.
        this.bits = bits ?? 32;
    }
}

export const U1 = new Primitive(0n, 0x1n, 1);
export const U4 = new Primitive(0n, 0xFn, 4);
export const U8 = new Primitive(0n, 0xFFn, 8);
export const U16 = new Primitive(0n, 0xFFFFn, 16);
export const U32 = new Primitive(0n, 0xFFFFFFFFn, 32);
export const I32 = new Primitive(-2147483648n, 2147483647n, 32);
export const F16 = new Primitive(Number.MIN_VALUE, Number.MAX_VALUE, 16);
export const F32 = new Primitive(Number.MIN_VALUE, Number.MAX_VALUE, 32);
export const F64 = new Primitive(Number.MIN_VALUE, Number.MAX_VALUE, 64);
