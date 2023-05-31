import { strict as assert } from "assert"
import BitArray from "../BitArray.js"

const array = new BitArray( 64 )

for ( let i = 0; i < 64; i++ )
    array.set( i, i % 2 )

for ( let i = 0; i < 64; i++ )
    assert.deepEqual( array.get( i ), i % 2 )

// console.log( Array.from( array.data ).map( x => x.toString( 2 ) ) )