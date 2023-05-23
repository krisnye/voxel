import React from "preact"
import { useState } from "preact/hooks"
import SceneComponent from "./SceneComponent"
import Babylon, { Engine, Scene, MeshBuilder, Vector3, Color3, FxaaPostProcess, Color4 } from "@babylonjs/core"
import { addDefaultLights, defaultCamera } from "../babylonjs/BabylonUtils"
import voxelMaterial from "../babylonjs/voxelMaterial"

export function App() {

    function onSceneInit( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) {
        scene.clearColor = new Color4( 0, 0, 0, 0 )
        addDefaultLights( scene )
        const camera = defaultCamera( scene )

        const voxelBoundingBox = MeshBuilder.CreateBox( "VoxelBoundingBox", { size: 1 } )
        voxelBoundingBox.position.x += .5
        voxelBoundingBox.position.y += .5
        voxelBoundingBox.position.z += .5
        voxelBoundingBox.material = voxelMaterial( scene )

        scene.onBeforeRenderObservable.add( () => {
            const fpsCounter = document.getElementById( "fpsCounter" )
            if ( fpsCounter )
                fpsCounter.innerText = `${ engine.getFps().toFixed( 2 ) } fps`
        } )

        const fxaa = new FxaaPostProcess( "fxaa", 2.0, camera )
    }

    return <div className="fullscreen relative">
        <div id="fpsCounter" className={"absolute"} style={{ left: "4px", top: "4px" }}>0 FPS</div>
        <SceneComponent onInitialize={onSceneInit} className="absolute no-outline" />
    </div>
}
