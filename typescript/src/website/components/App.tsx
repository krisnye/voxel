import React from "preact"
import { useState } from "preact/hooks"
import SceneComponent from "./SceneComponent"
import Babylon, {
    Engine, Scene, MeshBuilder, Vector3, Color3, FxaaPostProcess, Color4, Material,
    BoundingBox
} from "@babylonjs/core"
import { addDefaultLights, defaultCamera } from "../babylonjs/BabylonUtils"
import voxelMaterial from "../babylonjs/voxelMaterial"

export function App() {

    function onSceneInit( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) {
        scene.clearColor = new Color4( 0, 0, 0, 0 )
        addDefaultLights( scene )
        const camera = defaultCamera( scene )

        const voxelMaterialIns = voxelMaterial( scene )

        // Mesh used to draw voxels when camera is outside the volume.
        const voxelBoundingMesh = MeshBuilder.CreateBox( "VoxelBoundingBox", { size: 1 } )
        voxelBoundingMesh.position.x += .5
        voxelBoundingMesh.position.y += .5
        voxelBoundingMesh.position.z += .5
        voxelBoundingMesh.material = voxelMaterialIns
        voxelBoundingMesh.showBoundingBox = true

        // Mesh used to draw voxels when camera is inside the volume.
        const invertedVoxelMeshOptions = { size: camera.minZ * 3, sideOrientation: Material.CounterClockWiseSideOrientation }
        const invertedVoxelMesh = MeshBuilder.CreateBox( "InvertedVoxelMesh", invertedVoxelMeshOptions )
        invertedVoxelMesh.material = voxelMaterialIns
        invertedVoxelMesh.showBoundingBox = true

        const pad = camera.minZ
        const pad3f = new Vector3( pad, pad, pad )

        scene.onBeforeRenderObservable.add( () => {

            const boundingBox = voxelBoundingMesh.getBoundingInfo().boundingBox
            const paddedBoundingBox = new BoundingBox(
                boundingBox.minimum.subtract( pad3f ),
                boundingBox.maximum.add( pad3f ),
                boundingBox.getWorldMatrix()
            )

            const cameraInVoxelMesh = paddedBoundingBox.intersectsPoint( camera.position )
            if ( cameraInVoxelMesh ) {
                invertedVoxelMesh.position = camera.position
                invertedVoxelMesh.isVisible = true
                voxelBoundingMesh.isVisible = false
            } else {
                invertedVoxelMesh.isVisible = false
                voxelBoundingMesh.isVisible = true
            }

            const fpsCounter = document.getElementById( "fpsCounter" )
            if ( fpsCounter )
                fpsCounter.innerText = `${ engine.getFps().toFixed( 2 ) } FPS`
        } )

        const fxaa = new FxaaPostProcess( "fxaa", 2.0, camera )
    }

    return <div className="fullscreen relative">
        <SceneComponent onInitialize={onSceneInit} className="absolute no-outline" />
        <div id="fpsCounter" className={"absolute"} style={{ left: "6px", top: "4px" }} />
    </div>
}
