import { Engine, RawTexture3D, Scene, Texture } from "@babylonjs/core"

type DataArray = {
    [ key: number ]: number
    get length(): number
}

class OctreeLevel {
    constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly depth: number,
        public readonly volume: number = width * height * depth,
        public readonly minDimension: number = Math.min( width, height, depth ),
        public readonly data: Uint8ClampedArray = new Uint8ClampedArray( volume ),
    ) { }

    index( x: number, y: number, z: number ) {
        return x + this.width * ( y + this.height * z )
    }

    contains( x: number, y: number, z: number ) {
        return (
            x >= 0 && x < this.width &&
            y >= 0 && y < this.height &&
            z >= 0 && z < this.depth
        )
    }

    get( x: number, y: number, z: number ) {
        if ( !this.contains( x, y, z ) )
            return 0
        return this.data[ this.index( x, y, z ) ]
    }

    set( x: number, y: number, z: number, value: number ) {
        if ( !this.contains( x, y, z ) )
            return
        this.data[ this.index( x, y, z ) ] = value
    }
}

export function getOctreeLevels( width: number, height: number, depth: number, data: DataArray, emptyValue: number ) {
    const level0 = new OctreeLevel( width, height, depth )
    for ( let i = 0; i < data.length; i++ )
        level0.data[ i ] = data[ i ] == emptyValue ? 0 : 1

    const levels = [ level0 ] as OctreeLevel[]

    let prevLevel = level0
    while ( prevLevel.minDimension > 4 ) {
        let level = new OctreeLevel(
            Math.ceil( prevLevel.width / 2 ),
            Math.ceil( prevLevel.height / 2 ),
            Math.ceil( prevLevel.depth / 2 ),
        )

        for ( let z = 0; z < level.depth; z++ ) {
            for ( let y = 0; y < level.height; y++ ) {
                for ( let x = 0; x < level.width; x++ ) {

                    let hasSolidChild = 0
                    for ( let dz = 0; dz < 2; dz++ )
                        for ( let dy = 0; dy < 2; dy++ )
                            for ( let dx = 0; dx < 2; dx++ )
                                hasSolidChild |= prevLevel.get( x * 2 + dx, y * 2 + dy, z * 2 + dz )

                    level.set( x, y, z, hasSolidChild )

                }
            }
        }

        levels.push( level )
        prevLevel = level
    }

    return levels
}

export default function buildOctreeTexture( width: number, height: number, depth: number, data: DataArray, emptyValue: number, scene: Scene ) {
    const levels = getOctreeLevels( width, height, depth, data, emptyValue )
    const level0 = levels[ 0 ]

    // console.log( "Generated", levels.length, "levels." )

    const texture = new RawTexture3D(
        level0.data,
        level0.width, level0.height, level0.depth,
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

        // console.log( "Setting mip level:", levelIndex )
        // console.log( "Resolution:", level.width, level.height, level.depth )
        // console.log( "Array size: ", level.data.length )

        gl.texImage3D(
            target, levelIndex, gl.R8UI,
            level.width, level.height, level.depth, 0,
            gl.RED_INTEGER, gl.UNSIGNED_BYTE,
            level.data
        )

    } )
    engine._bindTextureDirectly( target, null )

    internalTexture.isReady = true

    texture.metadata = { lodLevels: levels.length }
    return texture as RawTexture3D & { metadata: { lodLevels: number } }

}
