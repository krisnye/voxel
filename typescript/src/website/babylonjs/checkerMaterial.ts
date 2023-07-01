import { Scene, ShaderMaterial, ShaderLanguage, Texture, TextureSampler, Constants } from "@babylonjs/core"
import gridUrl from "../assets/grid.png"

type Options = {}

export function checkerMaterial( name: string, options: Options, scene: Scene ) {
    const { } = options

    const material = new ShaderMaterial( name, scene,
        {
            vertexSource: /*wgsl*/ `   
            #include<sceneUboDeclaration>
            #include<meshUboDeclaration>
    
            attribute position : vec3f;
            attribute normal : vec3f;
            attribute uv: vec2f;
     
            varying vNormal : vec3f;
            varying vPos: vec3f;
            varying vUV : vec2f;
    
            @vertex
            fn main(input : VertexInputs) -> FragmentInputs {
                vertexOutputs.position = scene.viewProjection * mesh.world * vec4f(vertexInputs.position, 1.0);
                vertexOutputs.vNormal = (mesh.world * vec4f(vertexInputs.normal, 0.0)).xyz;
                vertexOutputs.vPos = (mesh.world * vec4f(vertexInputs.position, 1.0)).xyz;
                vertexOutputs.vUV = vertexInputs.uv;
            }    
        `,
            fragmentSource: /*wgsl*/ `

            #include<sceneUboDeclaration>

            var gridTex: texture_2d<f32>;
            var gridTexSampler: sampler;
    
            varying vNormal : vec3f;
            varying vPos: vec3f;
            varying vUV : vec2f;

            fn aasmoothstep(threshold: f32, x: f32, softness: f32) -> f32 {
                // let radius = fwidth(x) * softness;
                let radius = softness;
                return smoothstep(threshold - radius, threshold + radius, x);
            }

            fn sawtooth(x: f32) -> f32 {
                let m = modf(abs(x));
                if ( (i32(m.whole) & 1) == 1) {
                    return 1.0 - m.fract;
                } else {
                    return m.fract;
                }
            }

            fn smoothSquare(x: f32, softness: f32) -> f32 {
                return aasmoothstep(.5, sawtooth(x - .5), softness);
            }

            fn smoothSquare3(v: vec3f, radius: f32) -> vec3f {
                return vec3f(
                    smoothSquare(v.x, radius),
                    smoothSquare(v.y, radius),
                    smoothSquare(v.z, radius),
                );
            }

            fn checker3(v: vec3f, softness: f32) -> f32 {
                let s = smoothSquare3(v, softness);
                let checker = (s.x - .5) * (s.y - .5) * (s.z - .5) * 8.0; 
                return aasmoothstep(0, checker, softness);
            }
    
            @fragment
            fn main(input : FragmentInputs) -> FragmentOutputs {
                
                // let toFrag = fragmentInputs.vPos.xyz - scene.vEyePosition.xyz;
                // let dist = length(toFrag);
                // let alignment = -dot(toFrag, fragmentInputs.vNormal) / dist;
                
                // let softness = dist / alignment / 100.0;
                // let checker = checker3(fragmentInputs.vPos * 10.0 + vec3f(.5), softness);

                // fragmentOutputs.color = vec4f(fragmentInputs.vNormal * .5 + vec3f(.5), 0.0) * (checker * .5 + .5);
                fragmentOutputs.color = textureSample(gridTex, gridTexSampler, fragmentInputs.vUV);
            }
        `
        },
        {
            attributes: [ "position", "normal", "uv" ],
            uniformBuffers: [ "Scene", "Mesh" ],
            shaderLanguage: ShaderLanguage.WGSL
        }
    )

    // Setup grid texture/sampler //
    const gridTex = new Texture( gridUrl )
    material.setTexture( "gridTex", gridTex )
    //
    const gridTexSampler = new TextureSampler()
    gridTexSampler.setParameters()
    gridTexSampler.samplingMode = Constants.TEXTURE_NEAREST_SAMPLINGMODE
    material.setTextureSampler( "gridTexSampler", gridTexSampler )
    ////

    return material

}
