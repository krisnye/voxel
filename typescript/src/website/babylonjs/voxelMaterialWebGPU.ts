import { Scene, ShaderMaterial, ShaderLanguage, Texture, TextureSampler, Constants, UniformBuffer, Vector3, Matrix } from "@babylonjs/core"
import gridUrl from "../assets/grid.png"

type TextureDefs = {
    [ key: string ]: {
        type: string,
        dimension?: "2d" | "3d",
        sampler?: boolean,
        value: Texture,
    }
}

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
        let texture = defs[ name ]
        let { type, sampler = true, dimension = "2d" } = texture
        result.push( `var ${ name }: texture_${ dimension }<${ type }>;` )
        if ( sampler )
            result.push( `var ${ name }Sampler: sampler;` )
    }
    return result.join( "\n" )
}

export default function voxelMaterialWebGPU( name: string, options: Options, scene: Scene ) {
    const {
        textures,
        isOpaque = `return isOpaque_placeholder(pos, level);`,
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
                debugColor: vec4f,
                showDebug: bool,
            }

            // const testVolumeWidth = 200;
            fn isOpaque_placeholder(pos: vec3i, level: u32) -> bool {
                var result = false;
                var posf = vec3f(pos);
                let res = volume.resolution;
                let maxRes = max(res.x, max(res.y, res.z));
                var radius = f32(maxRes) / 2.0;
                var l = length(posf - vec3f(radius - .5));
                if (l < radius) { result = true; }
                return result;
            }

            fn getIsOccupied(pos: vec3i, level: u32) -> bool {
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

            // Source https://gist.github.com/DomNomNom/46bb1ce47f68d255fd5d
            fn intersectAABB(rayOrigin: vec3f, rayDir: vec3f, boxMin: vec3f, boxMax: vec3f) -> vec2f {
                let tMin = (boxMin - rayOrigin) / rayDir;
                let tMax = (boxMax - rayOrigin) / rayDir;
                let t1 = min(tMin, tMax);
                let t2 = max(tMin, tMax);
                let tNear = max(max(t1.x, t1.y), t1.z);
                let tFar = min(min(t2.x, t2.y), t2.z);
                return vec2f(tNear, tFar);
            }

            fn raytraceVoxels(posWorld: vec3f, directionWorld: vec3f, initialNormalWorld: vec3f) -> TraceResult {
                var traceResult: TraceResult;
                let iresolution = vec3i(volume.resolution);
                
                var pos = (texelTransforms.worldToTexel * vec4f(posWorld, 1.0)).xyz;
                let direction = normalize((texelTransforms.worldToTexel * vec4f(directionWorld, 0.0)).xyz);
                
                let startPos = pos;
                let resMax = f32(max( iresolution.x, max(iresolution.y, iresolution.z) ));
                
                // Step to the edge of the bounding box, or exit if we don't hit it.
                let intersectTime = intersectAABB( pos, direction, vec3(0.0), volume.resolution );
                let nearTime = intersectTime.x;
                if (intersectTime.x > intersectTime.y) { return traceResult; }
                if (nearTime > 1.0) {
                    // pos += direction * (nearTime - .0001);
                    pos += direction * (nearTime - 0.25);
                }

                var ipos = vec3i(floor(pos));
                var lodLevel = u32(volume.maxLod);
                
                // Exit early if we start in a voxel.
                if (getIsOccupied(ipos, 0u)) {
                    traceResult.normal = vec4f(initialNormalWorld, 0.0);
                    traceResult.position = vec4f(posWorld, 1.0);
                    traceResult.hit = true;
                    return traceResult;
                }

                for (var stepIter = 0u; stepIter < 256; stepIter++) {
                    
                    let stepSize = 1.0;
                    let step = direction * stepSize;

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

                        let outOfBounds = // Bounds padded by 1 voxel for numerical precision reasons.
                            ipos.x < -1 || ipos.x > iresolution.x ||
                            ipos.y < -1 || ipos.y > iresolution.y ||
                            ipos.z < -1 || ipos.z > iresolution.z;

                        
                        if (outOfBounds) {
                            // let normalizedDistance = length(pos - startPos) / resMax;
                            // traceResult.debugColor = vec4f(vec3f(1.0) / normalizedDistance, 1.0);
                            // traceResult.showDebug = true;
                            return traceResult;
                        }

                        traceResult.voxelReads++;
                        let occupied = getIsOccupied(ipos, lodLevel);
                        if (!occupied) {
                            continue;
                        }

                        traceResult.hit = true;
                        traceResult.cell = ipos;
                        let hitPos = previousPos + step * dt;
                        traceResult.position = texelTransforms.texelToWorld * vec4f(hitPos, 1.0);
                        traceResult.normal = normalize(vec4f(-sign(direction) * vec3f(mask), 0.0));
                        return traceResult;
                    }

                }

                return traceResult;
            }

            @fragment
            fn main(input : FragmentInputs) -> FragmentOutputs {
                let position = scene.vEyePosition.xyz;
                let direction = normalize(fragmentInputs.vPos - position);
                let normal = fragmentInputs.vNormal;
                let traceResult = raytraceVoxels(fragmentInputs.vPos, direction, normal);
                
                if (
                    !traceResult.hit
                     && !traceResult.showDebug
                ) {
                    discard;
                }
                
                if (traceResult.showDebug) {
                    fragmentOutputs.color = traceResult.debugColor;
                } else {
                    fragmentOutputs.color = vec4f( traceResult.normal.xyz * 0.5 + vec3f(0.5), 1.0);
                    // fragmentOutputs.color = vec4f( vec3f(f32(traceResult.voxelReads)), 1.0);
                }

                let clipPos = scene.viewProjection * vec4f(traceResult.position.xyz, 1.0);
                fragmentOutputs.fragDepth = clipPos.z / clipPos.w;
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
        volumeUBO.dispose()
        texelTransformsUBO.dispose()
    } )
    //
    // We may want to generate these UBO descriptions and WGSL structs from a single description.
    volumeUBO.addVector3( "resolution", resolution )
    volumeUBO.addUniform( "maxLod", 1 )
    volumeUBO.updateFloat( "maxLod", maxLod )
    volumeUBO.update()
    material.setUniformBuffer( "volume", volumeUBO )
    //
    texelTransformsUBO.addMatrix( "texelToWorld", texelToWorld )
    texelTransformsUBO.addMatrix( "worldToTexel", worldToTexel )
    texelTransformsUBO.update()
    material.setUniformBuffer( "texelTransforms", texelTransformsUBO )

    material.onBindObservable.add( ( mesh ) => {
        const node = mesh.parent ?? mesh

        node.getWorldMatrix().invertToRef( worldToTexel ).multiplyToRef( modelToTexel, worldToTexel )
        worldToTexel.invertToRef( texelToWorld )

        texelTransformsUBO.updateMatrix( "texelToWorld", texelToWorld )
        texelTransformsUBO.updateMatrix( "worldToTexel", worldToTexel )
        texelTransformsUBO.update()
    } )

    for ( let name in textures ) {
        const texture = textures[ name ]
        let { sampler = true } = texture
        material.setTexture( name, texture.value )
        if ( sampler ) {
            const texSampler = new TextureSampler()
            texSampler.setParameters()
            texSampler.samplingMode = Constants.TEXTURE_NEAREST_NEAREST
            material.setTextureSampler( `${ name }Sampler`, texSampler )
        }
    }

    { // Temporary, delete later.
        const gridTex = new Texture( gridUrl )
        material.setTexture( "gridTex", gridTex )

        const gridTexSampler = new TextureSampler()
        gridTexSampler.setParameters()
        gridTexSampler.samplingMode = Constants.TEXTURE_LINEAR_LINEAR_MIPLINEAR
        material.setTextureSampler( "gridTexSampler", gridTexSampler )
    }

    material.onEffectCreatedObservable.add( e => {
        console.log( e.effect.fragmentSourceCode )
    } )

    return material

}