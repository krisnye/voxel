import { TypedArrayConstructor, TypedData } from "./types.js";
import { Vector3, X, Y, Z } from "../math/types.js";

export class Volume<Data extends TypedData> {

    constructor(
        public readonly size: Vector3,
        public readonly data: Data
    ) {
    }

    static create<T extends { [ name: string ]: TypedArrayConstructor }>(
        size: Vector3,
        dataTypes: T )
        : Volume<{ [ K in keyof T ]: InstanceType<T[ K ]> }> {
        const length = size[ X ] * size[ Y ] * size[ Z ];
        const data = Object.fromEntries( Object.entries( dataTypes ).map( ( [ name, Type ] ) => {
            return [ name, new Type( length ) ];
        } ) ) as { [ K in keyof T ]: InstanceType<T[ K ]> };
        return new Volume( size, data );
    }

    /**
     * @returns the index of this voxel or else < 0 if value is out of bounds.
     */
    index( x: number, y: number, z: number ) {
        const [sizeX, sizeY, sizeZ] = this.size;
        if (x < 0) {
            return -1;
        }
        if (x >= sizeX) {
            return -2;
        }
        if (y < 0) {
            return -3;
        }
        if (y >= sizeY) {
            return -4
        }
        if (z < 0) {
            return -5;
        }
        if (z >= sizeZ) {
            return -6;
        }
        return x + ( y + ( z * sizeY ) * sizeX );
    }

}
