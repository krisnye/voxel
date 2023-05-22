import Babylon, { Scene, Engine } from "@babylonjs/core"
import { useEffect, useRef } from "preact/hooks"
import { debounce } from "../../utils/debounce"
import { HTMLAttributes, CSSProperties } from "preact/compat"

type SceneCallback = ( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) => void

type SceneComponentOptions = {
    onInitialize?: SceneCallback,
    engineOptions?: Babylon.EngineOptions & { antialias: boolean },
    style?: CSSProperties,
    [ key: string ]: any
} & Omit<HTMLAttributes<HTMLCanvasElement>, "style">

export default function SceneComponent( properties: SceneComponentOptions ) {
    const { onInitialize, engineOptions, style, ...rest } = properties

    const canvasRef = useRef<HTMLCanvasElement>( null )

    useEffect( () => {
        const canvas = canvasRef.current
        if ( !canvas )
            return

        const engine = new Engine( canvas, engineOptions?.antialias ?? true, engineOptions )
        const scene = new Scene( engine )

        if ( onInitialize )
            onInitialize( engine, scene, canvas )

        engine.runRenderLoop( () => scene.render() )

        const resizeObserver = new ResizeObserver( debounce( 200, () => engine.resize() ) )
        resizeObserver.observe( canvas )

        function cleanup() {
            engine.stopRenderLoop()
            engine.dispose()
            resizeObserver.unobserve( canvas as HTMLCanvasElement )
        }

        return cleanup
    }, [] )

    return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", ...style }} {...rest} />
}