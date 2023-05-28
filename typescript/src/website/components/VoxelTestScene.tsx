import React from "preact"
import { useState } from "preact/hooks"
import SceneComponent from "./SceneComponent"
import Babylon, {
    Engine, Scene, MeshBuilder, Vector3, Color3, FxaaPostProcess, Color4, Material,
    BoundingBox, StandardMaterial, RawTexture3D, Texture, Camera, Plane, DirectionalLight, ShadowGenerator, Mesh, PointLight, Light, Matrix, Vector4, Node, TransformNode
} from "@babylonjs/core"
import { addDefaultLights, defaultCamera, groupNodes } from "../babylonjs/BabylonUtils"
import voxelMaterial from "../babylonjs/voxelMaterial"
import voxelChunkNode from "../babylonjs/voxelChunkNode"
import buildOctreeTexture from "../babylonjs/buildOctreeTexture"

export default function VoxelTestScene() {

    function onSceneInit( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) {
        scene.clearColor = new Color4( 0, 0, 0, 0 )
        addDefaultLights( scene )
        const camera = defaultCamera( scene )
        const fxaa = new FxaaPostProcess( "fxaa", 1.0, camera )

        const voxelTexture = createVoxelTexture( scene )
        const resolution = voxelTexture.getSize().width
        const voxelMaterialIns = voxelMaterial( scene, {
            // getIsOccupied: `return texelFetch(voxelTexture, ivec3(pos / 4), 2).r > 0u;`,
            getIsOccupied: `return texelFetch(voxelTexture, ivec3(pos / (1 << lod)), int(lod)).r > 0u;`,
            // getIsOccupied: `return textureLod(voxelTexture, vec3(pos) / resolution, float(lod)).r > 0u;`,
            getDiffuse: `
                vec3 normal = traceResult.normal.xyz;
                return (normal + vec3(1.0)) / 2.0;
            `,
            textures: {
                voxelTexture: { type: "lowp usampler3D", value: voxelTexture }
            },
            resolution: resolution,
            maxLod: voxelTexture.metadata.lodLevels - 1
        } )

        camera.speed *= 128 / resolution

        let chunkNodes = [] as TransformNode[]
        const widthInChunks = 1
        const radiusInChunks = widthInChunks / 2
        for ( let i = 0; i < widthInChunks; i++ ) {
            for ( let j = 0; j < widthInChunks; j++ ) {
                let node = voxelChunkNode( `ChunkNode${ i }`, voxelMaterialIns, camera, scene )
                chunkNodes.push( node )
                // node.rotation.x = Math.floor( Math.random() * 4 ) * Math.PI / 2
                // node.rotation.y = Math.floor( Math.random() * 4 ) * Math.PI / 2
                // node.rotation.z = Math.floor( Math.random() * 4 ) * Math.PI / 2
                node.position.addInPlaceFromFloats( j - radiusInChunks, .5, i - radiusInChunks )
                node.metadata = { i, j }
            }
        }

        scene.onBeforeRenderObservable.add( () => {

            // const t = performance.now() / 1000 * Math.PI * 2
            // for ( let node of chunkNodes ) {
            //     let { i, j } = node.metadata as { i: number, j: number }
            //     let ft = .3 // Time frequency
            //     let fs = 1.5 // Spatial frequency
            //     let h = ( Math.sin( i * fs + t * ft ) * Math.sin( j * fs + t * ft ) * .5 + .5 ) * .1
            //     node.position.set( j - radiusInChunks, .5 + h, i - radiusInChunks )
            // }

            const fpsCounter = document.getElementById( "fpsCounter" )
            if ( fpsCounter )
                fpsCounter.innerText = `${ engine.getFps().toFixed( 2 ) } FPS`

        }, undefined, true )

        // const light = new PointLight( "tmpLight", new Vector3( -.501, 2.01, -.501 ), scene )
        // light.diffuse = new Color3( .75, .75, .5 )
        // light.shadowEnabled = true
        // const shadowGen = new ShadowGenerator( 1024, light, true )
        // // shadowGen.useBlurExponentialShadowMap = true
        // // shadowGen.filteringQuality = ShadowGenerator.QUALITY_HIGH
        // // @ts-ignore
        // shadowGen.getShadowMap().renderList.push( ...chunkNodes.map( n => n.getChildMeshes() ).flat() )

        // const plane = new Plane( 0, 1, 0, 0 )
        // const planeMesh = MeshBuilder.CreatePlane( "Ground", { size: 10, sourcePlane: plane, sideOrientation: Mesh.DOUBLESIDE } )
        // planeMesh.receiveShadows = true
        // const planeMat = new StandardMaterial( "PlaneMat", scene )
        // planeMat.specularColor = Color3.Black()
        // planeMat.diffuseColor = Color3.White().scaleInPlace( .5 )
        // planeMesh.material = planeMat

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

function createVoxelTexture( scene: Scene ) {
    const width = 1024
    const height = 256
    const depth = 1024
    const half = width / 2

    function hypot3( x: number, y: number, z: number ) {
        return Math.sqrt( x ** 2 + y ** 2 + z ** 2 )
    }

    // console.time( "allocate texture data" )
    const data = new Uint8ClampedArray( width * height * depth )
    // console.timeEnd( "allocate texture data" )

    // console.time( "compute texture data" )
    let i = 0
    for ( let z = 0; z < depth; z++ ) {
        for ( let y = 0; y < height; y++ ) {
            for ( let x = 0; x < width; x++ ) {
                let value = 0

                let xn = x / width
                let yn = y / height
                let zn = z / depth

                let freq = Math.PI * 2 * 5
                let h = Math.sin( xn * freq ) * Math.sin( zn * freq )
                h = .25 + .75 * h
                if ( h > yn )
                    value = 1

                // let value = Math.random() < .0001 ? 1 : 0

                // let x2 = x + .5 + Math.sin( y / 5 ) * 20
                // let y2 = y + .5 + Math.cos( z / 5 ) * 20
                // let z2 = z + .5 + Math.sin( x / 5 ) * 20

                // let radius = half
                // let r = hypot3( x2 - radius, y2 - radius, z2 - radius )
                // // if ( Math.abs( y - half ) < width / 80 )
                // //     r += width / 40
                // if ( r < half * .75 ) {
                //     // const h = radius * 1.8
                //     // const r2 = hypot3( x2 - h, y2 - h, z2 - h )
                //     // if ( r2 > width / 4 )
                //     value = 1
                // }

                data[ i++ ] = value
            }
        }
    }
    // console.timeEnd( "compute texture data" )

    // console.time( "construct 3d texture" )
    // const texture = new RawTexture3D(
    //     data, width, width, width, Engine.TEXTUREFORMAT_R_INTEGER, scene,
    //     false, false, Texture.NEAREST_NEAREST, Engine.TEXTURETYPE_UNSIGNED_BYTE
    // )
    const texture = buildOctreeTexture(
        width, height, depth,
        data, 0, scene
    )
    // console.timeEnd( "construct 3d texture" )

    return texture
}