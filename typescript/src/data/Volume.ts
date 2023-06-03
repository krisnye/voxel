import { Vector3, X, Y, Z } from "../math/types.js";
import { ArrayTypePrimitive } from "./Primitive.js";
import { StringKeyOf, stringKeys } from "../utils/StringUtils.js";

export class Volume<Types extends Record<string, ArrayTypePrimitive>> {

    private constructor(
        public readonly size: Vector3,
        public readonly types: Types,
        public readonly data: { [ K in keyof Types ]: InstanceType<Types[ K ][ "arrayType" ]> }
    ) {
    }

    static create<T extends Record<string, ArrayTypePrimitive>>(
        size: Vector3,
        types: T )
        : Volume<{ [ K in keyof T ]: T[ K ] }> {
        const length = size[ X ] * size[ Y ] * size[ Z ];
        const data = Object.fromEntries( Object.entries( types ).map( ( [ name, { arrayType: Type } ] ) => {
            return [ name, new Type( length ) ];
        } ) ) as { [ K in keyof T ]: InstanceType<T[ K ][ "arrayType" ]> };
        return new Volume( size, types, data );
    }

    /**
     * @returns the index of this voxel or else < 0 if value is out of bounds.
     */
    index( x: number, y: number, z: number ) {
        const [ sizeX, sizeY, sizeZ ] = this.size;
        if ( x < 0 ) {
            return -1;
        }
        if ( x >= sizeX ) {
            return -2;
        }
        if ( y < 0 ) {
            return -3;
        }
        if ( y >= sizeY ) {
            return -4
        }
        if ( z < 0 ) {
            return -5;
        }
        if ( z >= sizeZ ) {
            return -6;
        }
        return x + ( y + ( z * sizeY ) ) * sizeX;
    }

    public dataToString( name: StringKeyOf<Types> ) {
        const length = 8;
        const array = this.data[ name ];
        let sb = `  ${ name }:\n\n`;
        for ( let z = 0; z < this.size[ Z ]; z++ ) {
            for ( let y = 0; y < this.size[ Y ]; y++ ) {
                for ( let x = 0; x < this.size[ X ]; x++ ) {
                    let valueString = array[ this.index( x, y, z ) ].toFixed( 2 ).slice( 0, length ).padStart( length, " " );
                    sb += valueString + ", ";
                }
                sb += "\n";
            }
            sb += "\n";
        }
        return sb;
    }

    toString() {
        return `Volume${ this.size }\n\n` +
            stringKeys( this.data ).map( this.dataToString.bind( this ) ).join( "\n" );
    }

}
