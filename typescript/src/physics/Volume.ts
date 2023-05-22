import { TypedArrayConstructor, TypedData } from "../data/types.js";
import { Vector3, X, Y, Z } from "../math/types.js";

export class Volume<Data extends TypedData> {

    constructor(
        public readonly size: Vector3,
        public readonly data: Data
    ) {
    }

    static create<T extends { [name: string]: TypedArrayConstructor }>(
        size: Vector3,
        dataTypes: T)
        : Volume<{ [K in keyof T]: InstanceType<T[K]> }>
     {
        const length = size[X] * size[Y] * size[Z];
        const data = Object.fromEntries(Object.entries(dataTypes).map(([name, Type]) => {
            return [name, new Type(length)];
        })) as { [K in keyof T]: InstanceType<T[K]> };
        return new Volume(size, data);
    }

    index(x: number, y: number, z: number) {
        return x + (y + (z * this.size[Y]) * this.size[X]);
    }

}
