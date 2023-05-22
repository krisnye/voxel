import Babylon, { Engine, Scene, MeshBuilder, Vector3, DirectionalLight, Color3, FreeCamera } from "@babylonjs/core"
import { MouseButtons } from "../utils/MouseButtons"

export function addDefaultLights( scene: Scene ) {
    scene.createDefaultLight()

    const sunDir = new Vector3( -1, -3, -1 ).normalize()
    const sunLight = new DirectionalLight( "SunLight", sunDir, scene )
    sunLight.diffuse = new Color3( 1, 1, .5 )

    const bounceLightDir = new Vector3( 1, 3, 1 ).normalize()
    const bounceLight = new DirectionalLight( "BounceLight", bounceLightDir, scene )
    bounceLight.diffuse = new Color3( .35, .35, .5 )
}

export function defaultCamera( scene: Scene ) {
    const cam = new FreeCamera( "FreeCam", new Vector3( 0, 1, -1 ), scene )

    addWASDControls( cam )
    cam.attachControl()
    cam.speed *= 0.25

    cam.inputs.noPreventDefault = false

    let mouseInput = cam.inputs.attached.mouse as Babylon.FreeCameraMouseInput
    mouseInput.buttons = [ MouseButtons.Right ]

    cam.inputs.addMouseWheel()
    let wheelInput = ( cam.inputs.attached.mousewheel as unknown ) as Babylon.BaseCameraMouseWheelInput
    wheelInput.wheelPrecisionX *= 0.1
    wheelInput.wheelPrecisionY *= 0.1
    wheelInput.wheelPrecisionZ *= 0.1

    cam.position.x = 15
    cam.position.y = 15
    cam.position.z = 15
    cam.setTarget( new Vector3( 0, 0, 0 ) )

    return cam
}

export function addWASDControls( cam: FreeCamera ) {
    cam.keysUp.push( "W".charCodeAt( 0 ) )
    cam.keysDown.push( "S".charCodeAt( 0 ) )
    cam.keysLeft.push( "A".charCodeAt( 0 ) )
    cam.keysRight.push( "D".charCodeAt( 0 ) )
    cam.keysUpward.push( " ".charCodeAt( 0 ) )
    cam.keysDownward.push( 16 /*Left Shift*/ )
}
