import { Color3, Engine, Material, Matrix, Node, RawTexture3D, Scene, ShadowDepthWrapper, Texture, Vector3 } from "@babylonjs/core"
import { CustomMaterial } from "@babylonjs/materials"

import _voxelShaderDefinitions from "./voxelShaderDefinitions.frag?raw"
const endDefsToken = "// @end-defs"
const voxelShaderDefinitions = _voxelShaderDefinitions.slice( _voxelShaderDefinitions.indexOf( endDefsToken ) + endDefsToken.length )

type VoxelMaterialOptions = {
    getDiffuse?: string,
    getIsOccupied?: string,
    // Todo: Make resolution a Vector3.
    resolution?: number,
    maxLod?: number,
    /** Given in model space. */
    texelOrigin?: Vector3,
    textures?: { [ key: string ]: { type: string, value: Texture } },
    fragDefinitions?: string
}

export default function voxelMaterial(
    scene: Scene,
    options: VoxelMaterialOptions,
    isShadowMaterial: boolean = false
) {
    const {
        getIsOccupied = "return getIsOccupided_placeHolder(pos, lod);",
        getDiffuse = "return (traceResult.normal.xyz + vec3(1.0)) / 2.0;",
        resolution = 200,
        maxLod = 0,
        texelOrigin = new Vector3( .5, .5, .5 ),
        textures,
        fragDefinitions = ""
    } = options

    const material = new CustomMaterial( `VoxelMaterial${ isShadowMaterial ? "_shadow" : "" }`, scene )

    material.transparencyMode = Material.MATERIAL_OPAQUE

    if ( !isShadowMaterial )
        material.shadowDepthWrapper = new ShadowDepthWrapper( voxelMaterial( scene, options, true ), scene, { standalone: true } )

    if ( textures ) {
        for ( let name in textures )
            material.AddUniform( name, textures[ name ].type, undefined )
        material.onBindObservable.add( () => {
            const effect = material.getEffect()
            for ( let name in textures )
                effect.setTexture( name, textures[ name ].value )
        } )
    }

    console.log( "Material max lod:", maxLod )

    const worldToTexel = new Matrix()
    const texelToWorld = new Matrix()
    const modelToTexel = Matrix.Translation( texelOrigin.x, texelOrigin.y, texelOrigin.z )
        .multiply( Matrix.Scaling( resolution, resolution, resolution ) )
    material.AddUniform( "worldToTexel", "mat4", undefined )
    material.AddUniform( "texelToWorld", "mat4", undefined )
    material.AddUniform( "resolution", "float", undefined )
    material.AddUniform( "maxLod", "float", undefined )

    material.onBindObservable.add( ( mesh ) => {
        const node = mesh.parent ?? mesh
        const effect = material.getEffect()

        node.getWorldMatrix().invertToRef( worldToTexel ).multiplyToRef( modelToTexel, worldToTexel )
        worldToTexel.invertToRef( texelToWorld )

        effect.setMatrix( "worldToTexel", worldToTexel )
        effect.setMatrix( "texelToWorld", texelToWorld )
        effect.setFloat( "resolution", resolution )
        effect.setFloat( "maxLod", maxLod )
    } )

    material.alphaMode = 1
    material.specularColor = Color3.White().scale( .1 )

    const fragCode = fragDefinitions + "\n" + voxelShaderDefinitions
        .replace( "// @get-diffuse", getDiffuse )
        .replace( "// @get-is-occupied", getIsOccupied )

    material.Fragment_Definitions( fragCode )
    material.Fragment_Custom_Diffuse( `

        ${ !isShadowMaterial ? `` : `
            // This is necessary for the moment because shadow maps don't update vEyePosition when rendering.
            vec4 vEyePosition2 = inverse(view) * vec4(.0, .0, .0, 1.);
            viewDirectionW = normalize( vEyePosition2.xyz - vPositionW);
        ` }

        TraceResult traceResult = raytraceVoxels(vEyePosition.xyz, -viewDirectionW, normalW);
        if (!traceResult.hit) 
            discard;

        ${ isShadowMaterial ? `` : `
            normalW = traceResult.normal.xyz;
            diffuseColor = getDiffuse(traceResult);

            // ivec3 cell = traceResult.cell;
            // if ( (cell.x + cell.y + cell.z) % 2 == 0 )
            //     diffuseColor *= .75;
        ` }

    `)
    material.Fragment_MainEnd( `
        // if (traceResult.error)
        //     glFragColor = vec4( 1.0, 0.0, 0.0, 1.0 );

        // glFragColor = vec4( vec3( traceResult.voxelReads ) / 400.0, 1.0 );
        // glFragColor.rgb *= 1.0 - float(traceResult.voxelReads) / float(resolution);
        // glFragColor.rgb *= 1.0 - float(traceResult.voxelReads) / float(128);
        
        vec4 clipPos = viewProjection * vec4(traceResult.position.xyz, 1.0);
        float ndcDepth = clipPos.z / clipPos.w; // in range (-1, 1)
        gl_FragDepth = (1.0 + ndcDepth) / 2.0; // gl_FragDepth expects range (0, 1)

    ` )

    return material
}

