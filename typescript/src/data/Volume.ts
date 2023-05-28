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

    public dataToString(name: keyof TypedData) {
        const length = 8;
        const array = this.data[name];
        let sb = `  ${name}:\n\n`;
        // for (let z = 0; z < this.size[Z]; z++) {
        // invert z because visibly, that starts at the bottom
        for (let z = this.size[Z] - 1; z >= 0; z--) {
            for (let y = 0; y < this.size[Y]; y++) {
                for (let x = 0; x < this.size[X]; x++) {
                    let valueString = array[this.index(x, y, z)].toFixed(2).slice(0, length).padStart(length, " ");
                    sb += valueString + ",";
                }
                sb += "\n";
            }
        }
        return sb;
    }

    toString() {
        return `Volume${this.size}\n\n` +
            Object.keys(this.data).map(this.dataToString.bind(this)).join("\n");
    }

}
