import { Engine, InternalTexture, InternalTextureSource, RawTexture3D, Scene, Texture, TextureUsage, WebGPUEngine } from "@babylonjs/core"
import { WebGPUHardwareTexture } from "@babylonjs/core/Engines/WebGPU/webgpuHardwareTexture"
import { emit } from "process"
import { wrapWebGPUTexture } from "./BabylonUtils"

/**
 * Represents a level of an octree with each 2x2x2 cell packed into single bytes.
 */
class VoxelOctreeLevel {

    public readonly widthInBytes: number
    public readonly heightInBytes: number
    public readonly depthInBytes: number
    public readonly volume: number
    public readonly minDimension: number
    public readonly data: Uint8ClampedArray

    constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly depth: number
    ) {
        if ( width & 1 || height & 1 || depth & 1 )
            throw new Error( "OctreeLevel requires even dimensions." )
        this.volume = width * height * depth
        this.minDimension = Math.min( width, height, depth )
        this.data = new Uint8ClampedArray( Math.max( this.volume / 8, 64 ) )
        this.widthInBytes = this.width >> 1
        this.heightInBytes = this.height >> 1
        this.depthInBytes = this.depth >> 1
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

    byteIndex( x: number, y: number, z: number ) {
        return ( x >> 1 ) + this.widthInBytes * ( ( y >> 1 ) + this.heightInBytes * ( z >> 1 ) )
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

export default class VoxelOctree {

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
        while ( prevLevel.minDimension > 2 ) {
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

    static wgsl_sampleOctree( textureName: string ) {
        let name = textureName
        return /*wgsl*/ `fn sampleOctree_${ name }(pos: vec3i, lod: u32) -> bool {
            if (pos.x < 0 || pos.y < 0 || pos.z < 0) { return false; }
            let dims = vec3i(textureDimensions(${ name }, 0u)) * 2;
            if (pos.x >= dims.x || pos.y >= dims.y || pos.z >= dims.z) { return false; }

            let lodPos = pos / (1 << lod);
            let byte = textureLoad( ${ textureName }, lodPos / 2, u32(lod) ).r;
            let bitIndex = u32(lodPos.x & 1) + 2u * u32(lodPos.y & 1) + 4u * u32(lodPos.z & 1);
            let value = (byte >> bitIndex) & 1u;
            return value > 0u;
        }`
    }

    buildTexture( scene: Scene ) {
        const engine = scene.getEngine()
        let texture: Texture
        if ( engine instanceof WebGPUEngine )
            texture = this.buildTexture_WebGPU( engine, scene )
        else
            texture = this.buildTexture_WebGL( engine, scene )
        texture.metadata = { lodLevels: this.levels.length }
        return texture as RawTexture3D & { metadata: { lodLevels: number } }
    }

    buildTexture_WebGPU( engine: WebGPUEngine, scene: Scene ) {
        const levels = this.levels
        const level0 = levels[ 0 ]

        const device = engine._device
        const queue = device.queue

        const gpuTexture = device.createTexture( {
            dimension: "3d",
            format: "r8uint",
            size: [ level0.widthInBytes, level0.heightInBytes, level0.depthInBytes ],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            mipLevelCount: levels.length
        } )

        for ( let i = 0; i < levels.length; i++ ) {
            const level = levels[ i ]
            queue.writeTexture(
                { texture: gpuTexture, mipLevel: i },
                level.data,
                {
                    bytesPerRow: level.widthInBytes,
                    rowsPerImage: level.heightInBytes
                },
                {
                    width: level.widthInBytes,
                    height: level.heightInBytes,
                    depthOrArrayLayers: level.depthInBytes
                }
            )
        }

        return wrapWebGPUTexture( engine, scene, gpuTexture )
    }

    buildTexture_WebGL( engine: Engine, scene: Scene ) {
        let levels = this.levels
        let level0 = levels[ 0 ]

        const texture = new RawTexture3D(
            level0.data,
            level0.widthInBytes, level0.heightInBytes, level0.depthInBytes,
            Engine.TEXTUREFORMAT_R_INTEGER, scene,
            false, false, Texture.NEAREST_NEAREST_MIPNEAREST,
            Engine.TEXTURETYPE_UNSIGNED_BYTE
        )

        const internalTexture = texture.getInternalTexture()

        if ( !internalTexture )
            throw new Error( "Could not access internal texture to set mipmaps." )

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
                level.widthInBytes, level.heightInBytes, level.depthInBytes, 0,
                gl.RED_INTEGER, gl.UNSIGNED_BYTE,
                level.data
            )
        } )

        engine._bindTextureDirectly( target, null )
        internalTexture.isReady = true

        return texture
    }

}
