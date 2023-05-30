export default class BitArray {

    public readonly data: Uint32Array

    constructor( public length: number ) {
        this.data = new Uint32Array( Math.ceil( length / 32 ) )
    }

    set( i: number, value: number ) {
        let index = Math.floor( i >> 5 )
        let bitIndex = i - ( index << 5 )
        if ( value )
            this.data[ index ] |= 1 << bitIndex
        else
            this.data[ index ] &= ~( 1 << bitIndex )
    }

    get( i: number ) {
        let index = Math.floor( i >> 5 )
        let bitIndex = i - ( index << 5 )
        return ( this.data[ index ] >> bitIndex ) & 1
    }

}