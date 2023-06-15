import { Scene, ShaderMaterial, ShaderLanguage } from "@babylonjs/core"

type Options = {}

export function voxelMaterialWebGPU( name: string, options: Options, scene: Scene ) {
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
                vertexOutputs.vNormal = vertexInputs.normal;
                vertexOutputs.vPos = vertexInputs.position;
                vertexOutputs.vUV = vertexInputs.uv;
            }    
        `,
            fragmentSource: /*wgsl*/ `
    
            varying vNormal : vec3f;
            varying vPos: vec3f;
            varying vUV : vec2f;
    
            @fragment
            fn main(input : FragmentInputs) -> FragmentOutputs {
                // fragmentOutputs.color = vec4f(1.0, 0.0, 0.0, 1.0);
                fragmentOutputs.color = vec4f(fragmentInputs.vNormal * .5 + vec3f(.5), 0.0);

                let epsilon = 1.0001;
                let pos = vec3f(fragmentInputs.vPos);
                let i = dot(vec3i(floor(fract(pos * 10.0/epsilon) * 2.0)), vec3i(1));
                let imod = i % 2;

                if (imod == 0) {
                    fragmentOutputs.color *= .5;
                }
            }
        `
        },
        {
            attributes: [ "position", "normal", "uv" ],
            uniformBuffers: [ "Scene", "Mesh" ],
            shaderLanguage: ShaderLanguage.WGSL
        }
    )

    return material

}
