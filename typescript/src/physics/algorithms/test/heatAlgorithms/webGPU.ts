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

    const device = await GPUHelper.getDevice();
    if ( !device ) {
        return null;
    }

    // create volume gpu pipeline
    const volumePipeline = VolumePipeline.create( device, {
        input: {},
        output: {
            output: "F32"
        },
        shader: /* wgsl */`
            @compute @workgroup_size(1)
            fn main(
                @builtin(workgroup_id) workgroup_id : vec3u,
                @builtin(num_workgroups) num_workgroups : vec3u,
            ) {
                //  this should give me index into volume data
                let index = (workgroup_id.z * num_workgroups.y + workgroup_id.y) * num_workgroups.x + workgroup_id.x;
                output[index] += f32(index);
            }
    `} );

    // create cpu volume
    const volume = Volume.create( [ 4, 4, 4 ], { output: "F32" } );
    // let's write some values to the cpu volume in memory
    volume.data.output.fill( 69000 );
    // create gpu volume (we are copying from memory, we could also create without copying)
    const gpuVolume = GPUVolume.createFromCPUVolume( device, volume, { read: true } );
    // run a pass
    const commandEncoder = volumePipeline.encodePass( gpuVolume );
    // queue it and wait for finish.
    device.queue.submit( [ commandEncoder.finish() ] );
    await device.queue.onSubmittedWorkDone();
    // copy the gpu volume data back to cpu
    await gpuVolume.copyToCPU( volume );

    console.log( volume.toString() );

    return async () => {
        console.log( "HELLO WEBGPU" );
    }

}
