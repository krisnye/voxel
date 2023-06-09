import Babylon, { Scene, Engine, WebGPUEngine, ElbowBlock } from "@babylonjs/core"
import { useEffect, useRef } from "preact/hooks"
import { debounce } from "../../utils/debounce"
import { HTMLAttributes, CSSProperties } from "preact/compat"
import { webGPU } from "../../physics/algorithms/test/heatAlgorithms/webGPU"

type SceneCallback = ( engine: Engine, scene: Scene, canvas: HTMLCanvasElement ) => void

type SceneComponentOptions = {
    onInitialize?: SceneCallback,
    engineOptions?: Babylon.EngineOptions & { antialias: boolean },
    style?: CSSProperties,
    webGPU?: boolean,
    [ key: string ]: any
} & Omit<HTMLAttributes<HTMLCanvasElement>, "style">

export default function SceneComponent( properties: SceneComponentOptions ) {
    const { onInitialize, engineOptions, webGPU, style, ...rest } = properties

    const canvasRef = useRef<HTMLCanvasElement>( null )

    useEffect( () => {
        const canvas = canvasRef.current
        if ( !canvas )
            return

        const initEngineAsync = webGPU ?
            async function () {
                const engine = new WebGPUEngine( canvas, { antialias: engineOptions?.antialias } )
                await engine.initAsync()
                return engine
            } :
            async function () {
                return new Engine( canvas, engineOptions?.antialias ?? true, engineOptions )
            }

        let engine: Engine
        let resizeObserver: ResizeObserver
        initEngineAsync().then(
            _engine => {
                engine = _engine
                if ( !canvas ) return
                let scene = new Scene( engine )
                if ( onInitialize )
                    onInitialize( engine, scene, canvas )

                engine.runRenderLoop( () => scene.render() )

                resizeObserver = new ResizeObserver( debounce( 200, () => engine.resize() ) )
                resizeObserver.observe( canvas )
            }
        )

        function cleanup() {
            engine.stopRenderLoop()
            engine.dispose()
            resizeObserver.unobserve( canvas as HTMLCanvasElement )
        }

        return cleanup
    }, [] )

    return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", ...style }} {...rest} />
}
