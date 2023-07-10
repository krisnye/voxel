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

            // uniform resolution: vec3f;
            // uniform PAD_1: f32;
            // uniform maxLod: f32;
            struct Volume {
                resolution: vec3f,
                maxLod: f32
            }
            var<uniform> volume: Volume;
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

            // const testVolumeWidth = 200;
            // fn getIsOccupied_placeholder(pos: vec3i, level: i32) -> bool {
            //     var result = false;
            //     var posf = vec3f(pos);
            //     // let res = max(uniforms.resolution.x, max(uniforms.resolution.y, uniforms.resolution.z));
            //     // var radius = f32(res) / 2.0;
            //     var radius = uniforms.resolution / 2.0;
            //     var l = length(posf - vec3f(radius - .5));
            //     if (l < radius) { result = true; }
            //     return true;
            // }

            fn getIsOccupied(pos: vec3i, level: i32) -> bool {
                ${ isOpaque }
            }

            fn sort3(a: vec3f) -> vec3f {
                var b = a;
                // Manual bubble sort.
                if (b.y < b.x) { b = b.yxz; }
                if (b.z < b.y) { b = b.xzy; }
                if (b.y < b.x) { b = b.yxz; }
                return b;
            }

            fn raytraceVoxels(posWorld: vec3f, headingWorld: vec3f) {
                var traceResult: TraceResult;
                // let iresolution = vec3i(uniforms.resolution);

                var pos = (texelTransforms.worldToTexel * vec4f(posWorld, 1.0)).xyz;
                let heading = normalize((texelTransforms.worldToTexel * vec4f(headingWorld, 0.0)).xyz);

                var ipos = vec3i(floor(pos));
                var lodLevel = u32(volume.maxLod);

                for (var stepIter = 0u; stepIter < 256; stepIter++) {
                    let stepSize = 1.0;
                    let step = heading * stepSize;

                    let cellMin = floor(pos / stepSize) * stepSize;
                    let cellMax = cellMin + vec3f(stepSize);
                    let dts = max((cellMin - pos) / step, (cellMax - pos) / step);
                    let sortedDts = sort3(dts);

                    let previousPos = pos;
                    pos += step;
                    let idelta = vec3i(floor(pos)) - ipos;

                    // Step through each x/y/z face crossed in order of time to impact.
                    for (var i: i32 = 0; i < 3; i++) {
                        let dt = sortedDts[i];
                        let mask = vec3i(i32(dts.x == dt), i32(dts.y == dt), i32(dts.z == dt));
                        ipos += idelta * vec3i(mask);

                        // let outOfBounds =
                        //     ipos.x < 0 || ipos.x >= iresolution.x ||
                        //     ipos.y < 0 || ipos.y >= iresolution.y ||
                        //     ipos.z < 0 || ipos.z >= iresolution.z;
                    }

                }
            }

            @fragment
            fn main(input : FragmentInputs) -> FragmentOutputs {
                // fragmentOutputs.color = textureSample(gridTex, gridTexSampler, fragmentInputs.vUV) * uniforms.maxLod;
                fragmentOutputs.color = textureSample(gridTex, gridTexSampler, fragmentInputs.vUV) * volume.maxLod;
            }
        `
        },
        {
            attributes: [ "position", "normal", "uv" ],
            uniformBuffers: [ "Scene", "Mesh" ],
            shaderLanguage: ShaderLanguage.WGSL
        }
    )

    const worldToTexel = new Matrix()
    const texelToWorld = new Matrix()
    const resolutionMax = Math.max( resolution.x, resolution.y, resolution.z )
    const modelToTexel = Matrix.Translation( texelOrigin.x, texelOrigin.y, texelOrigin.z )
        .multiply( Matrix.Scaling( resolutionMax, resolutionMax, resolutionMax ) )

    const volumeUBO = new UniformBuffer( scene.getEngine() )
    const texelTransformsUBO = new UniformBuffer( scene.getEngine() )
    scene.onDisposeObservable.add( () => {
        texelTransformsUBO.dispose()
        volumeUBO.dispose()
    } )
    //
    volumeUBO.addVector3( "resolution", resolution )
    volumeUBO.addUniform( "maxLod", 1 )
    volumeUBO.updateFloat( "maxLod", maxLod )
    volumeUBO.update()
    material.setUniformBuffer( "volume", volumeUBO )
    //
    texelTransformsUBO.addMatrix( "worldToTexel", worldToTexel )
    texelTransformsUBO.addMatrix( "texelToWorld", texelToWorld )
    texelTransformsUBO.update()
    material.setUniformBuffer( "texelTransforms", texelTransformsUBO )

    material.onBindObservable.add( ( mesh ) => {
        const node = mesh.parent ?? mesh

        node.getWorldMatrix().invertToRef( worldToTexel ).multiplyToRef( modelToTexel, worldToTexel )
        worldToTexel.invertToRef( texelToWorld )

        texelTransformsUBO.updateMatrix( "worldToTexel", worldToTexel )
        texelTransformsUBO.updateMatrix( "texelToWorld", texelToWorld )

        volumeUBO.updateFloat( "maxLod", Math.sin( performance.now() / 500 ) * .25 + .75 )
        volumeUBO.update()
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

    material.onEffectCreatedObservable.add( e => {
        console.log( e.effect.fragmentSourceCode )
    } )

    return material

}