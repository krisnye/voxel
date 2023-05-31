import { Engine, RawTexture3D, Scene, Texture } from "@babylonjs/core"

/**
 * Represents a level of an octree with 2x2x2 cells packed into single bytes.
 */
class VoxelOctreeLevel {

    public readonly halfWidth: number
    public readonly halfHeight: number
    public readonly halfDepth: number

    constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly depth: number,
        public readonly volume: number = width * height * depth,
        public readonly minDimension: number = Math.min( width, height, depth ),
        public readonly data: Uint8ClampedArray = new Uint8ClampedArray( Math.max( volume / 8, 64 ) ),
    ) {
        if ( width & 1 || height & 1 || depth & 1 )
            throw new Error( "OctreeLevel requires even dimensions." )
        this.halfWidth = this.width >> 1
        this.halfHeight = this.height >> 1
        this.halfDepth = this.depth >> 1
    }

    static createFromChild( childLevel: VoxelOctreeLevel ) {
        let level = new VoxelOctreeLevel(
            Math.ceil( childLevel.width / 2 ),
            Math.ceil( childLevel.height / 2 ),
            Math.ceil( childLevel.depth / 2 ),
        )

        for ( let z = 0; z < level.depth; z++ ) {
            for ( let y = 0; y < level.height; y++ ) {
                for ( let x = 0; x < level.width; x++ ) {
                    let hasSolidChild = childLevel.data[ childLevel.byteIndex( x * 2, y * 2, z * 2 ) ] // != 0
                    level.set( x, y, z, hasSolidChild )
                }
            }
        }

        return level
    }

    static createFromDataArray( width: number, height: number, depth: number, data: DataArray ) {
        const level = new VoxelOctreeLevel( width, height, depth )
        let i = 0
        for ( let z = 0; z < depth; z++ )
            for ( let y = 0; y < height; y++ )
                for ( let x = 0; x < width; x++ )
                    level.set( x, y, z, data[ i++ ] )
        return level
    }

    contains( x: number, y: number, z: number ) {
        return (
            x >= 0 && x < this.width &&
            y >= 0 && y < this.height &&
            z >= 0 && z < this.depth
        )
    }

    byteIndex( x: number, y: number, z: number ) {
        return Math.floor( x >> 1 ) + this.halfWidth * ( Math.floor( y >> 1 ) + this.halfHeight * Math.floor( z >> 1 ) )
    }

    bitIndex( x: number, y: number, z: number ) {
        return ( x & 1 ) + 2 * ( y & 1 ) + 4 * ( z & 1 )
    }

    get( x: number, y: number, z: number ) {
        let byteIndex = this.byteIndex( x, y, z )
        let bitIndex = this.bitIndex( x, y, z )
        return ( this.data[ byteIndex ] >> bitIndex ) & 1

    }

    set( x: number, y: number, z: number, value: number ) {
        let byteIndex = this.byteIndex( x, y, z )
        let bitIndex = this.bitIndex( x, y, z )
        if ( value )
            this.data[ byteIndex ] |= 1 << bitIndex
        else
            this.data[ byteIndex ] &= ~( 1 << bitIndex )
    }
}

type DataArray = { [ key: number ]: number, get length(): number }

export class VoxelOctree {

    levels: VoxelOctreeLevel[]

    constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly depth: number,
        data: DataArray
    ) {
        const level0 = VoxelOctreeLevel.createFromDataArray( width, height, depth, data )
        const levels = [ level0 ] as VoxelOctreeLevel[]
        let prevLevel = level0
        while ( prevLevel.minDimension > 4 ) {
            let level = VoxelOctreeLevel.createFromChild( prevLevel )
            levels.push( level )
            prevLevel = level
        }
        this.levels = levels
    }

    static glsl_sampleOctree =
        `bool sampleOctree(lowp usampler3D texture, ivec3 pos, uint lod) {
            ivec3 lodPos = pos / (1 << lod);
            uint byte = texelFetch( texture, lodPos / 2, int( lod ) ).r;
            uint bitIndex = uint(lodPos.x & 1) + 2u * uint(lodPos.y & 1) + 4u * uint(lodPos.z & 1);
            uint value = (byte >> bitIndex) & 1u;
            return value > 0u;
        }`

    buildTexture( scene: Scene ) {
        let levels = this.levels
        let level0 = levels[ 0 ]

        const texture = new RawTexture3D(
            level0.data,
            level0.width / 2, level0.height / 2, level0.depth / 2,
            Engine.TEXTUREFORMAT_R_INTEGER, scene,
            false, false, Texture.NEAREST_NEAREST_MIPNEAREST,
            Engine.TEXTURETYPE_UNSIGNED_BYTE
        )

        const internalTexture = texture.getInternalTexture()

        if ( !internalTexture )
            throw new Error( "Could not access internal texture to set mipmaps." )

        const engine = scene.getEngine()
        const gl = engine._gl
        const target = gl.TEXTURE_3D

        engine._bindTextureDirectly( target, internalTexture, true, true )

        gl.texParameteri( target, gl.TEXTURE_BASE_LEVEL, 0 )
        gl.texParameteri( target, gl.TEXTURE_MAX_LEVEL, levels.length - 1 )
        gl.texParameterf( target, gl.TEXTURE_MIN_LOD, 0 )
        gl.texParameterf( target, gl.TEXTURE_MAX_LOD, levels.length - 1 )
        gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST )

        internalTexture.isReady = false
        internalTexture.useMipMaps = true
        internalTexture.generateMipMaps = true

        levels.forEach( ( level, levelIndex ) => {
            if ( levelIndex == 0 )
                return
            gl.texImage3D(
                target, levelIndex, gl.R8UI,
                level.width / 2, level.height / 2, level.depth / 2, 0,
                gl.RED_INTEGER, gl.UNSIGNED_BYTE,
                level.data
            )
        } )

        engine._bindTextureDirectly( target, null )
        internalTexture.isReady = true

        texture.metadata = { lodLevels: levels.length }
        return texture as RawTexture3D & { metadata: { lodLevels: number } }

    }

}
