import React from "preact"
import { useState } from "preact/hooks"
import SceneComponent from "./SceneComponent"
import Babylon, {
    Engine, Scene, MeshBuilder, Vector3, Color3, FxaaPostProcess, Color4, Material,
    BoundingBox, StandardMaterial, RawTexture3D, Texture, Camera, Plane, DirectionalLight, ShadowGenerator, Mesh, PointLight, Light, Matrix, Vector4
} from "@babylonjs/core"
import { addDefaultLights, defaultCamera, groupNodes } from "../babylonjs/BabylonUtils"
import voxelMaterial from "../babylonjs/voxelMaterial"

export function App() {

    function onSceneInit( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) {
        scene.clearColor = new Color4( 0, 0, 0, 0 )
        addDefaultLights( scene )
        const camera = defaultCamera( scene )
        const fxaa = new FxaaPostProcess( "fxaa", 1.0, camera )

        const voxelTexture = createVoxelTexture( scene )
        const voxelMaterialIns = voxelMaterial( scene, {
            getIsOccupied: `return texelFetch(voxelTexture, ivec3(pos), 0).r > 0u;`,
            getDiffuse: `
                vec3 normal = traceResult.normal.xyz;
                return (normal + vec3(1.0)) / 2.0;
            `,
            textures: {
                voxelTexture: { type: "lowp usampler3D", value: voxelTexture }
            },
            resolution: voxelTexture.getSize().width
        } )

        let voxelChunkNode = makeVoxelChunkNode( "ChunkNode0", voxelMaterialIns, camera, scene )
        voxelChunkNode.position.x += .5
        voxelChunkNode.position.y += .5
        voxelChunkNode.position.z += .5

        scene.onBeforeRenderObservable.add( () => {

            const t = performance.now() / 1000 * Math.PI * 2
            voxelChunkNode.position.y = .75 + Math.sin( t / 16 ) / 10
            voxelChunkNode.rotation.y = t / 10

            const fpsCounter = document.getElementById( "fpsCounter" )
            if ( fpsCounter ) fpsCounter.innerText = `${ engine.getFps().toFixed( 2 ) } FPS`
        }, undefined, true )


        const light = new PointLight( "tmpLight", new Vector3( -.501, 2.01, -.501 ), scene )
        light.diffuse = new Color3( .75, .75, .5 )
        light.shadowEnabled = true
        const shadowGen = new ShadowGenerator( 1024, light, true )
        // shadowGen.useBlurExponentialShadowMap = true
        // shadowGen.filteringQuality = ShadowGenerator.QUALITY_HIGH
        // @ts-ignore
        shadowGen.getShadowMap().renderList.push( ...voxelChunkNode.getChildMeshes() )

        const plane = new Plane( 0, 1, 0, 0 )
        const planeMesh = MeshBuilder.CreatePlane( "Ground", { size: 10, sourcePlane: plane, sideOrientation: Mesh.DOUBLESIDE } )
        // planeMesh.position.y += .5
        planeMesh.receiveShadows = true
        const planeMat = new StandardMaterial( "PlaneMat", scene )
        planeMat.specularColor = Color3.Black()
        planeMat.diffuseColor = Color3.White().scaleInPlace( .5 )
        planeMesh.material = planeMat

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

function makeVoxelChunkNode( name: string, material: Material, camera: Camera, scene: Scene ) {

    // Mesh used to draw voxels when camera is outside the volume.
    const voxelBoundingMesh = MeshBuilder.CreateBox( "VoxelBoundingBox", { size: 1.1 } )
    voxelBoundingMesh.material = material
    // voxelBoundingMesh.showBoundingBox = true

    // Mesh used to draw voxels when camera is inside the volume.
    const invertedVoxelMeshOptions = { diameter: camera.minZ * 3, sideOrientation: Material.CounterClockWiseSideOrientation }
    const invertedVoxelMesh = MeshBuilder.CreateSphere( "InvertedVoxelMesh", invertedVoxelMeshOptions )
    invertedVoxelMesh.material = material
    // invertedVoxelMesh.showBoundingBox = true

    const group = groupNodes( name, voxelBoundingMesh, invertedVoxelMesh )

    const pad = camera.minZ * 2
    const pad3f = new Vector3( pad, pad, pad )
    const paddedBoundingBox = new BoundingBox( new Vector3(), new Vector3(), undefined )

    const groupToWorldMat = new Matrix()
    const renderObserver = scene.onBeforeRenderObservable.add( () => {

        const boundingBox = voxelBoundingMesh.getBoundingInfo().boundingBox
        // We need to pad the bounding box because the camera might be within the near clipping distance of the bounding volume,
        // which could cause a flicker when entering the volume.
        paddedBoundingBox.reConstruct(
            boundingBox.minimum.subtractToRef( pad3f, paddedBoundingBox.minimum ),
            boundingBox.maximum.addToRef( pad3f, paddedBoundingBox.maximum ),
            boundingBox.getWorldMatrix()
        )

        const cameraInVoxelMesh = paddedBoundingBox.intersectsPoint( camera.position )
        if ( cameraInVoxelMesh ) {
            group.computeWorldMatrix( true ).invertToRef( groupToWorldMat )
            Vector3.TransformCoordinatesToRef( camera.position, groupToWorldMat, invertedVoxelMesh.position )
            invertedVoxelMesh.isVisible = true
            // voxelBoundingMesh.isVisible = false
        } else {
            invertedVoxelMesh.isVisible = false
            // voxelBoundingMesh.isVisible = true
        }

    } )

    group.onDisposeObservable.add( () => {
        scene.onBeforeRenderObservable.remove( renderObserver )
    } )

    return group

}

function createVoxelTexture( scene: Scene ) {
    const width = 100
    const half = width / 2

    function hypot3( x: number, y: number, z: number ) {
        return Math.sqrt( x ** 2 + y ** 2 + z ** 2 )
    }

    // console.time( "allocate texture data" )
    const data = new Uint8ClampedArray( width ** 3 )
    // console.timeEnd( "allocate texture data" )

    // console.time( "compute texture data" )
    let i = 0
    for ( let z = 0; z < width; z++ ) {
        for ( let y = 0; y < width; y++ ) {
            for ( let x = 0; x < width; x++ ) {
                let value = 0

                let x2 = x + .5 + Math.sin( y / 5 ) * 20
                let y2 = y + .5 + Math.cos( z / 5 ) * 20
                let z2 = z + .5 + Math.sin( x / 5 ) * 20

                let radius = half
                let r = hypot3( x2 - radius, y2 - radius, z2 - radius )
                // if ( Math.abs( y - half ) < width / 80 )
                //     r += width / 40
                if ( r < half * .5 ) {
                    const h = radius * 1.8
                    const r2 = hypot3( x2 - h, y2 - h, z2 - h )
                    if ( r2 > width / 4 )
                        value = 1
                }

                data[ i++ ] = value
            }
        }
    }
    // console.timeEnd( "compute texture data" )

    // console.time( "construct 3d texture" )
    const texture = new RawTexture3D(
        data, width, width, width, Engine.TEXTUREFORMAT_R_INTEGER, scene,
        false, false, Texture.NEAREST_NEAREST, Engine.TEXTURETYPE_UNSIGNED_BYTE
    )
    // console.timeEnd( "construct 3d texture" )


    return texture
}