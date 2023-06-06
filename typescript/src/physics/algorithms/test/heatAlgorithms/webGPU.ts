import { GPUHelper } from "../../../../gpu/GPUHelper.js";
import { GPUVolume } from "../../../../gpu/GPUVolume.js";
import { MaterialLookup } from "../../../VoxelMaterial.js";
import { HeatTransferVolumeType } from "../algorithms.test.js";
import { createApplyHeatVolumePipeline } from "./webGPU_applyHeat.js";
import { createCalculateHeatVolumePipeline } from "./webGPU_calculateHeat.js";

//  so, how compute shaders work.
//  shader defines a workgroup size: uvec3 and invocation function
//  pipeline is called with a workgroup count: uvec3
//  total invocations = workgroup size * workgroup count
export async function webGPU( volume: HeatTransferVolumeType, lookup: MaterialLookup, timeStep: number, count: number ) {

    const device = await GPUHelper.getDevice();
    if ( !device ) {
        return null;
    }

    // create volume gpu pipeline
    const calculateHeatPipeline = createCalculateHeatVolumePipeline( device );
    const applyHeatPipeline = createApplyHeatVolumePipeline( device );

    // create gpu volume (we are copying from memory, we could also create without copying)
    const gpuVolume = GPUVolume.createFromCPUVolume( device, volume, { read: true } );
    const gpuLookup = GPUVolume.createFromCPUVolume( device, lookup );

    return async () => {
        //  run a pass, two calls.
        const commandEncoder = device.createCommandEncoder();
        const args = { size: gpuVolume.size, buffers: { ...gpuVolume.buffers, ...gpuLookup.buffers } };
        for ( let i = 0; i < count; i++ ) {
            //  calculate heat
            calculateHeatPipeline.encodePass( args, commandEncoder );
            //  apply heat
            applyHeatPipeline.encodePass( args, commandEncoder )
        }
        //  queue it and wait for finish.
        device.queue.submit( [ commandEncoder.finish() ] );
        await device.queue.onSubmittedWorkDone();
        //  copy the gpu volume data back to cpu
        await gpuVolume.copyToCPU( volume );

        // console.log( volume.toString( { radix: 16 } ) );
        console.log( "!!!!!!!!!!HELLO WEBGPU" );
    }

}
