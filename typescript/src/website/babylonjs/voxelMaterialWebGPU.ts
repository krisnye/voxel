import { Scene, ShaderMaterial, ShaderLanguage, Texture, TextureSampler, Constants, UniformBuffer, Vector3, Matrix } from "@babylonjs/core"
import gridUrl from "../assets/grid.png"

type TextureDefs = { [ key: string ]: { type: string, value: Texture } }

type Options = {
    textures?: TextureDefs,
    isOpaque?: string,
    fragDefinitions?: string,
    resolution?: Vector3,
    /** Given in model space. */
    texelOrigin?: Vector3,
    maxLod?: number,
}

function getTextureDeclarations( defs: TextureDefs ) {
    let result: string[] = []
    for ( let name in defs ) {
        let type = defs[ name ].type
        result.push( `var ${ name }: texture_2d<${ type }>;\nvar ${ name }Sampler: sampler;` )
    }
    return result.join( "\n" )
}

export default function voxelMaterialWebGPU( name: string, options: Options, scene: Scene ) {
    const {
        textures,
        isOpaque = `return true;`,
        fragDefinitions = ``,
        resolution = new Vector3( 200, 200, 200 ),
        texelOrigin = new Vector3( .5, .5, .5 ),
        maxLod = 1,
    } = options

    const textureDeclarations = getTextureDeclarations( textures ?? {} )

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

            uniform maxLod: f32;
            uniform resolution: f32;
            struct TexelTransforms {
                texelToWorld: mat4x4f,
                worldToTexel: mat4x4f
            }
            var<uniform> texelTransforms: TexelTransforms;

            #include<sceneUboDeclaration>

            ${ textureDeclarations }
            ${ fragDefinitions }

            var gridTex: texture_2d<f32>;
            var gridTexSampler: sampler;
    
            varying vNormal : vec3f;
            varying vPos: vec3f;
            varying vUV : vec2f;

            struct TraceResult {
                position: vec4f,
                cell: vec3i,
                normal: vec4f,
                hit: bool,
                voxelReads: u32,
            }

            // Return the vector with the minimum x value.
            fn min2(a: vec2f, b: vec2f) -> vec2f {
                return select(a, b, a.x > b.x);
            }

            const testVolumeWidth = 200;
            fn getIsOccupied_placeholder(pos: vec3i, level: i32) -> bool {
                var result = false;
                var posf = vec3f(pos);
                var radius = f32(uniforms.resolution) / 2.0;
                var l = length(posf - vec3f(radius - .5));
                if (l < radius) { result = true; }
                return true;
            }

            fn getIsOccupied(pos: vec3i, level: i32) -> bool {
                ${ isOpaque }
            }

            fn raytraceVoxels(posWorld: vec3f, headingWorld: vec3f) {
                var traceResult: TraceResult;

                var pos = (texelTransforms.worldToTexel * vec4f(posWorld, 1.0)).xyz;
                let heading = normalize((texelTransforms.worldToTexel * vec4f(headingWorld, 0.0)).xyz);


                var ipos = vec3i(floor(pos));
                var lodLevel = uniforms.maxLod;

                for (var stepIter = 0u; stepIter < 256; stepIter++) {
                    let stepSize = 1.0;
                    let displacement = heading * stepSize;

                    let cellMin = floor(pos / stepSize) * stepSize;
                    let cellMax = cellMin + vec3f(stepSize);
                    let dts = max(
                        (cellMin - pos) / displacement, 
                        (cellMax - pos) / displacement
                    );
                    let minDt = min(dts.x, min(dts.y, dts.z));


                    let previousPos = pos;
                    pos += displacement;

                }
            }

            @fragment
            fn main(input : FragmentInputs) -> FragmentOutputs {
                fragmentOutputs.color = textureSample(gridTex, gridTexSampler, fragmentInputs.vUV) * uniforms.maxLod;
            }
        `
        },
        {
            attributes: [ "position", "normal", "uv" ],
            uniformBuffers: [ "Scene", "Mesh", "texelTransforms" ],
            shaderLanguage: ShaderLanguage.WGSL
        }
    )

    const worldToTexel = new Matrix()
    const texelToWorld = new Matrix()
    const resolutionMax = Math.max( resolution.x, resolution.y, resolution.z )
    const modelToTexel = Matrix.Translation( texelOrigin.x, texelOrigin.y, texelOrigin.z )
        .multiply( Matrix.Scaling( resolutionMax, resolutionMax, resolutionMax ) )

    const texelTransforms = new UniformBuffer( scene.getEngine() )
    scene.onDisposeObservable.add( () => texelTransforms.dispose() )

    texelTransforms.addMatrix( "worldToTexel", worldToTexel )
    texelTransforms.addMatrix( "texelToWorld", texelToWorld )
    texelTransforms.update()

    material.setUniformBuffer( "texelTransforms", texelTransforms )
    material.setVector3( "resolution", resolution )
    material.setFloat( "maxLod", maxLod )

    material.onBindObservable.add( ( mesh ) => {
        const node = mesh.parent ?? mesh

        node.getWorldMatrix().invertToRef( worldToTexel ).multiplyToRef( modelToTexel, worldToTexel )
        worldToTexel.invertToRef( texelToWorld )

        texelTransforms.updateMatrix( "worldToTexel", worldToTexel )
        texelTransforms.updateMatrix( "texelToWorld", texelToWorld )
    } )


    // Setup grid texture/sampler //
    const gridTex = new Texture( gridUrl )
    material.setTexture( "gridTex", gridTex )
    //
    const gridTexSampler = new TextureSampler()
    gridTexSampler.setParameters()
    gridTexSampler.samplingMode = Constants.TEXTURE_LINEAR_LINEAR_MIPLINEAR
    material.setTextureSampler( "gridTexSampler", gridTexSampler )
    ///////////////////////////////

    return material

}