import React from "preact"
import { useState } from "preact/hooks"
import SceneComponent from "./SceneComponent"
import Babylon, { Engine, Scene, MeshBuilder, Vector3, Color3 } from "@babylonjs/core"
import { addDefaultLights, defaultCamera } from "../utils/BabylonUtils"

export function App() {

    function onSceneInit( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) {
        const camera = defaultCamera( scene )

        addDefaultLights( scene )

        const box = MeshBuilder.CreateBox( "box", { size: 1 } )
    }

    return (
        <div className="fullscreen">
            <SceneComponent onInitialize={onSceneInit} className="no-outline" />
        </div>
    )
}
