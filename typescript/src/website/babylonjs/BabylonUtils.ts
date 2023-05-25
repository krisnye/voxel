import Babylon, { Scene, Vector3, DirectionalLight, Color3, FreeCamera, HemisphericLight, TransformNode, Node } from "@babylonjs/core"
import { MouseButtons } from "../utils/MouseButtons"

export function addDefaultLights( scene: Scene ) {
    // scene.createDefaultLight()

    // const sunDir = new Vector3( -3, -3, -1 ).normalize()
    // const sunLight = new DirectionalLight( "sunLight", sunDir, scene )
    // sunLight.diffuse = new Color3( 1, 1, .5 )
    // // sunLight.position.y += 1

    // const bounceLightDir = new Vector3( 3, 3, 1 ).normalize()
    // const bounceLight = new DirectionalLight( "bounceLight", bounceLightDir, scene )
    // bounceLight.diffuse = new Color3( .35, .35, .5 )

    const i = .5 // ambient intensity
    createAmbientLight( "ambientLight", new Color3( i, i, i ), scene )
}

export function createAmbientLight( name: string, color: Color3, scene: Scene ) {
    const ambientLightUp = new HemisphericLight( `${ name }_up`, Vector3.Up(), scene )
    const ambientLightDown = new HemisphericLight( `${ name }_down`, Vector3.Down(), scene )
    ambientLightUp.diffuse = ambientLightDown.diffuse = color
    return groupNodes( name, ambientLightUp, ambientLightDown )
}

export function groupNodes( name: string, ...nodes: Node[] ) {
    const group = new TransformNode( name )
    for ( let node of nodes )
        node.parent = group
    return group
}

export function defaultCamera( scene: Scene ) {
    const cam = new FreeCamera( "freeCam", new Vector3( 0, 1, -1 ), scene )
    cam.minZ = 0.01

    addWASDControls( cam )
    cam.attachControl()
    cam.speed *= 0.025

    cam.inputs.noPreventDefault = false

    let mouseInput = cam.inputs.attached.mouse as Babylon.FreeCameraMouseInput
    mouseInput.buttons = [ MouseButtons.Right ]

    cam.inputs.addMouseWheel()
    let wheelInput = ( cam.inputs.attached.mousewheel as unknown ) as Babylon.BaseCameraMouseWheelInput
    wheelInput.wheelPrecisionX *= 0.02
    wheelInput.wheelPrecisionY *= 0.02
    wheelInput.wheelPrecisionZ *= 0.02

    cam.position.x = 2
    cam.position.y = 2
    cam.position.z = 2
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
