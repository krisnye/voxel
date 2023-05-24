import { Engine, Scene, Vector3 } from "@babylonjs/core"
import { CustomMaterial } from "@babylonjs/materials"

import _voxelShaderDefinitions from "./voxelShaderDefinitions.frag?raw"
const voxelShaderDefinitions = _voxelShaderDefinitions
    .replace( "#version 300 es", "" )
    .replace( "precision highp float;", "" )

export default function voxelMaterial( scene: Scene ) {
    const material = new CustomMaterial( "VoxelMaterial", scene )

    material.alphaMode = 1

    material.Fragment_Definitions( voxelShaderDefinitions )
    material.Fragment_MainBegin( `
    ` )
    material.Fragment_Custom_Diffuse( `
        TraceResult traceResult = raytraceVoxels(vPositionW, -viewDirectionW);
        normalW = traceResult.normal.xyz;
        if (!traceResult.hit)
            discard;
        diffuseColor = (viewDirectionW + vec3(1.0)) / 2.0;
    `)
    material.Fragment_MainEnd( `
        // glFragColor = vec4((viewDirectionW + vec3(1.0)) / 2.0, 1.0);
        glFragColor = vec4((normalW + vec3(1.0)) / 2.0, 1.0);
        // glFragColor = vec4(viewDirectionW, 1.0);
    ` )

    return material
}

