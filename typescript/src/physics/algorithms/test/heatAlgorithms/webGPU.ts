import { F32 } from "../../../../data/Primitive.js";
import { Volume } from "../../../../data/Volume.js";
import { GPUHelper } from "../../../../gpu/GPUHelper.js";
import { GPUVolume } from "../../../../gpu/GPUVolume.js";
import { VolumePipeline } from "../../../../gpu/GPUVolumePipeline.js";
import { VoxelMaterial } from "../../../VoxelMaterial.js";
import { HeatTransferVolumeType } from "../algorithms.test.js";


//  so, how compute shaders work.
//  shader defines a workgroup size: uvec3 and invocation function
//  pipeline is called with a workgroup count: uvec3
//  total invocations = workgroup size * workgroup count

export async function webGPU( v: HeatTransferVolumeType, materials: VoxelMaterial[], timeStep: number ) {
    if ( !GPUHelper.supported ) {
        return null;
    }

    // create volume gpu pipeline
    const volumePipeline = await VolumePipeline.create( {
        input: {},
        output: {
            output: F32
        },
        shader: `
@compute @workgroup_size(1,1,1)
fn main(
    @builtin(workgroup_id) workgroup_id : vec3u,
    @builtin(num_workgroups) size : vec3u,
) {
    //  this should give me index into volume data
    let index = workgroup_id.z * size.y * size.x + workgroup_id.y * size.x + workgroup_id.x;
    output[index] = f32(index);
    // kody, try these outputs instead to see each value
    // output[index] = f32(workgroup_id.z);    //  looks good
    // output[index] = f32(workgroup_id.y);    //  looks wrong
    // output[index] = f32(workgroup_id.x);    //  looks wrong
}`} );

    // create cpu volume
    const volume = Volume.create( [ 2, 2, 2 ], { output: F32 } );
    const { device } = volumePipeline;

    // create gpu volume
    const gpuVolume = GPUVolume.create( device, { ...volume, read: true } );
    // run a pass
    const commandEncoder = volumePipeline.encodePass( gpuVolume );
    // queue it and wait for finish.
    device.queue.submit( [ commandEncoder.finish() ] );
    await device.queue.onSubmittedWorkDone();
    // copy the gpu volume data back to cpu
    const cpuVolume = await gpuVolume.copyToCPU( volume );
    console.log( cpuVolume.toString() );

    return async () => {
        console.log( "HELLO WEBGPU" );
    }

}
