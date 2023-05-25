import { Color3, Engine, RawTexture3D, Scene, ShadowDepthWrapper, Texture, Vector3 } from "@babylonjs/core"
import { CustomMaterial } from "@babylonjs/materials"

import _voxelShaderDefinitions from "./voxelShaderDefinitions.frag?raw"
const endDefsToken = "// @end-defs"
const voxelShaderDefinitions = _voxelShaderDefinitions.slice( _voxelShaderDefinitions.indexOf( endDefsToken ) + endDefsToken.length )

type VoxelMaterialOptions = {
    getTexel?: string,
    getDiffuse?: string,
    textures?: { [ key: string ]: { type: string, value: Texture } }
}

export default function voxelMaterial(
    scene: Scene, {
        getTexel = "return calcPlaceholderTexel(pos);",
        getDiffuse = "return (traceResult.normal.xyz + vec3(1.0)) / 2.0;",
        textures
    }: VoxelMaterialOptions
) {
    const material = new CustomMaterial( "VoxelMaterial", scene )

    material.shadowDepthWrapper = new ShadowDepthWrapper( material, scene )

    if ( textures ) {
        for ( let name in textures )
            material.AddUniform( name, textures[ name ].type, undefined )
        material.onBindObservable.add( () => {
            const effect = material.getEffect()
            for ( let name in textures )
                effect.setTexture( name, textures[ name ].value )
        } )
    }

    material.alphaMode = 1
    material.specularColor = Color3.White().scale( .1 )

    const fragCode = voxelShaderDefinitions
        .replace( "// @get-texel", getTexel )
        .replace( "// @get-diffuse", getDiffuse )

    material.Fragment_Definitions( fragCode )
    material.Fragment_MainBegin( `
    ` )
    material.Fragment_Custom_Diffuse( `

        // This is necessary for the moment because shadow maps don't update vEyePosition when rendering.
        vec4 vEyePosition2 = inverse(view) * vec4(.0, .0, .0, 1.);
        viewDirectionW = normalize( vEyePosition2.xyz - vPositionW);

        TraceResult traceResult = raytraceVoxels(vPositionW, -viewDirectionW, normalW);
        normalW = traceResult.normal.xyz;
        if (!traceResult.hit) discard;
        // diffuseColor = (normalW + vec3(1.0)) / 2.0;
        diffuseColor = getDiffuse(traceResult);

        // ivec3 cell = traceResult.cell;
        // if ( (cell.x + cell.y + cell.z) % 2 == 0 )
        //     diffuseColor *= .75;
    `)
    material.Fragment_MainEnd( `
        // if (traceResult.error)
        //     glFragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
        
        vec4 clipPos = viewProjection * vec4(traceResult.position.xyz, 1.0);
        gl_FragDepth = (1.0 + clipPos.z / clipPos.w) / 2.0;
    ` )

    return material
}

