import React from "preact"
import SceneComponent from "./SceneComponent"
import {
    Engine, Scene, FxaaPostProcess, Color4, TransformNode, Vector3, Texture
} from "@babylonjs/core"
import { addDefaultLights, defaultCamera, groupNodes } from "../babylonjs/BabylonUtils"
import voxelMaterial from "../babylonjs/voxelMaterial"
import voxelChunkNode from "../babylonjs/voxelChunkNode"
import VoxelOctree from "../babylonjs/VoxelOctree"

export default function VoxelTestScene() {

    function onSceneInit( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) {
        scene.clearColor = new Color4( 0, 0, 0, 0 )
        addDefaultLights( scene )
        const camera = defaultCamera( scene )
        const fxaa = new FxaaPostProcess( "fxaa", 1.0, camera )

        const sceneOctree = createSceneOctree( scene )
        const voxelOctreeTexture = sceneOctree.buildTexture( scene )

        const voxelMaterialIns = voxelMaterial( scene, {
            fragDefinitions: VoxelOctree.glsl_sampleOctree,
            getIsOccupied: `
                return sampleOctree(voxelOctreeTexture, pos, lod);
            `,
            getDiffuse: `
                vec3 normal = traceResult.normal.xyz;
                return (normal + vec3(1.0)) / 2.0;
            `,
            maxLod: voxelOctreeTexture.metadata.lodLevels - 1,
            resolution: new Vector3( sceneOctree.width, sceneOctree.height, sceneOctree.depth ),
            textures: {
                voxelOctreeTexture: { type: "lowp usampler3D", value: voxelOctreeTexture }
            },
        } )

        camera.speed *= 128 / sceneOctree.width

        let chunkNodes = [] as TransformNode[]
        const widthInChunks = 1
        const radiusInChunks = widthInChunks / 2
        for ( let i = 0; i < widthInChunks; i++ ) {
            for ( let j = 0; j < widthInChunks; j++ ) {
                let node = voxelChunkNode( `ChunkNode${ i }`, voxelMaterialIns, camera, scene )
                chunkNodes.push( node )
                node.position.addInPlaceFromFloats( j - radiusInChunks, .5, i - radiusInChunks )
                node.metadata = { i, j }
            }
        }

        scene.onBeforeRenderObservable.add( () => {
            const fpsCounter = document.getElementById( "fpsCounter" )
            if ( fpsCounter )
                fpsCounter.innerText = `${ engine.getFps().toFixed( 2 ) } FPS`

        }, undefined, true )
    }

    return <div className="fullscreen relative">
        <SceneComponent onInitialize={onSceneInit} className="absolute no-outline" />

        <div id="fpsCounter" className={"absolute"} style={{
            backgroundColor: "rgba(52,52,52,.75)",
            borderRadius: "4px", padding: "2px 4px",
            left: "2px", top: "2px"
        }} />
    </div>

}

function createSceneOctree( scene: Scene ) {
    const width = 1024
    const height = 256
    const depth = 1024

    const data = new Uint8ClampedArray( width * height * depth )

    let heightMap = new Float32Array( width * depth )
    function calcHeight( x: number, z: number ) {
        let i = x + width * z
        if ( heightMap[ i ] == 0 ) {
            let xn = x / width
            let zn = z / depth
            let freq = Math.PI * 2 * 5
            let h = Math.sin( xn * freq ) * Math.sin( zn * freq )
            heightMap[ i ] = .25 + .75 * h
        }
        return heightMap[ i ]
    }

    let i = 0
    for ( let z = 0; z < depth; z++ ) {
        for ( let y = 0; y < height; y++ ) {
            for ( let x = 0; x < width; x++ ) {
                let value = 0

                // if ( x == z && y == 0 )
                //     value = 1

                let yn = y / height
                let h = calcHeight( x, z )
                if ( h > yn )
                    value = 1

                data[ i++ ] = value
            }
        }
    }

    const octree = new VoxelOctree( width, height, depth, data )

    return octree
}