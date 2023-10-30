import React from "preact"
import SceneComponent from "./SceneComponent"
import {
    Engine, Scene, FxaaPostProcess, Color4, TransformNode, Vector3, Texture, StandardMaterial, AxesViewer
} from "@babylonjs/core"
import { addDefaultLights, defaultCamera, groupNodes } from "../babylonjs/BabylonUtils"
import voxelMaterial from "../babylonjs/voxelMaterial"
import voxelChunkNode from "../babylonjs/voxelChunkNode"
import VoxelOctree from "../babylonjs/VoxelOctree"

import { checkerMaterial } from "../babylonjs/checkerMaterial"
import voxelMaterialWebGPU from "../babylonjs/voxelMaterialWebGPU"

export default function VoxelTestScene() {

    function onSceneInit( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) {
        scene.clearColor = new Color4( 0, 0, 0, 0 )
        addDefaultLights( scene )
        const camera = defaultCamera( scene )
        const fxaa = new FxaaPostProcess( "fxaa", 1.0, camera )

        const sceneOctree = createSceneOctree( scene )
        const voxelOctreeTexture = sceneOctree.buildTexture( scene )


        camera.speed *= 128 / sceneOctree.width

        const voxelMaterialIns = voxelMaterialWebGPU( "VoxelMaterial", {
            fragDefinitions: VoxelOctree.wgsl_sampleOctree( "octreeTex" ),
            isOpaque: "return sampleOctree_octreeTex(pos, level);",
            maxLod: voxelOctreeTexture.metadata.lodLevels - 1,
            resolution: new Vector3( sceneOctree.width, sceneOctree.height, sceneOctree.depth ),
            textures: {
                octreeTex: { type: "u32", dimension: "3d", sampler: false, value: voxelOctreeTexture }
            }
        }, scene )

        let chunkNodes = [] as TransformNode[]
        const widthInChunks = 1
        const radiusInChunks = widthInChunks / 2
        for ( let i = 0; i < widthInChunks; i++ ) {
            for ( let j = 0; j < widthInChunks; j++ ) {

                let node = voxelChunkNode( `ChunkNode${ i }`, voxelMaterialIns, camera, scene )
                chunkNodes.push( node )
                node.position.addInPlaceFromFloats( j - radiusInChunks + .5, .5, i - radiusInChunks + .5 )
                node.metadata = { i, j }

            }
        }

        // new AxesViewer( scene )

        scene.onBeforeRenderObservable.add( () => {

            // for ( let chunk of chunkNodes ) {
            //     let { position, metadata } = chunk
            //     let { i, j } = metadata
            //     let phase = Math.sin( i - .5 ) * Math.sin( j - .5 ) * Math.PI * 2
            //     let t = performance.now() / 1000
            //     let freq = Math.PI * 2 / 5
            //     let amp = .25
            //     position.y = Math.sin( t * freq + phase ) * amp
            // }

            const fpsCounter = document.getElementById( "fpsCounter" )
            if ( fpsCounter )
                fpsCounter.innerText = `${ engine.getFps().toFixed( 2 ) } FPS`

        }, undefined, true )
    }

    return <div className="fullscreen relative">
        <SceneComponent webGPU onInitialize={onSceneInit} className="absolute no-outline" />

        <div id="fpsCounter" className={"absolute"} style={{
            backgroundColor: "rgba(52,52,52,.75)",
            borderRadius: "4px", padding: "2px 4px",
            left: "2px", top: "2px"
        }} />
    </div>

}

function createSceneOctree( scene: Scene ) {
    const width = 1024
    const height = width / 4
    const depth = width

    const data = new Uint8ClampedArray( width * height * depth )

    let heightMap = new Float32Array( width * depth )
    function calcHeight( x: number, z: number ) {
        let i = x + width * z
        if ( heightMap[ i ] == 0 ) {
            let xn = ( x + .5 ) / width
            let zn = ( z + .5 ) / depth
            let freq = Math.PI * 2 * 5 // 1.5
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