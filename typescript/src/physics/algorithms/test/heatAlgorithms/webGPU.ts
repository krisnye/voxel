import { VoxelMaterial } from "../../../VoxelMaterial.js";
import { HeatTransferVolumeType } from "../algorithms.test.js";
import "../../../../types/webgpu.js";

declare global {
    interface GPUDevice {
        foo(): boolean;
    }
}

export async function webGPU( v: HeatTransferVolumeType, materials: VoxelMaterial[], timeStep: number ) {
    // init here.
    if ( !globalThis.navigator ) {
        return null;
        // throw new Error(`Not in browser`);
    }
    if ( !navigator.gpu ) {
        return null;
        // throw Error("WebGPU not supported.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if ( !adapter ) {
        return null;
        // throw Error("Couldn't request WebGPU adapter.");
    }

    const device = await adapter.requestDevice();

    const BUFFER_SIZE = 1000;

    const shader = `
@group(0) @binding(0)
var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3u,

  @builtin(local_invocation_id)
  local_id : vec3u,
) {
  // Avoid accessing the buffer out of bounds
//   if (global_id.x >= ${ BUFFER_SIZE }) {
//     return;
//   }

  output[global_id.x] =
    f32(global_id.x) * 1000. + f32(local_id.x);
}
`

    const shaderModule = device.createShaderModule( {
        code: shader,
    } );

    const output = device.createBuffer( {
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    } );

    const stagingBuffer = device.createBuffer( {
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    } );

    const bindGroupLayout = device.createBindGroupLayout( {
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                },
            },
        ],
    } );

    const bindGroup = device.createBindGroup( {
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: output,
                },
            },
        ],
    } );

    const computePipeline = device.createComputePipeline( {
        layout: device.createPipelineLayout( {
            bindGroupLayouts: [ bindGroupLayout ],
        } ),
        compute: {
            module: shaderModule,
            entryPoint: "main",
        },
    } );

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline( computePipeline );
    passEncoder.setBindGroup( 0, bindGroup );
    passEncoder.dispatchWorkgroups( Math.ceil( BUFFER_SIZE / 64 ) );
    passEncoder.end();

    // Copy output buffer to staging buffer
    commandEncoder.copyBufferToBuffer(
        output,
        0, // Source offset
        stagingBuffer,
        0, // Destination offset
        BUFFER_SIZE
    );

    // End frame by passing array of command buffers to command queue for execution
    device.queue.submit( [ commandEncoder.finish() ] );

    // map staging buffer to read results back to JS
    await stagingBuffer.mapAsync(
        GPUMapMode.READ,
        0, // Offset
        BUFFER_SIZE // Length
    );

    const copyArrayBuffer = stagingBuffer.getMappedRange( 0, BUFFER_SIZE );
    const data = copyArrayBuffer.slice( 0 );
    stagingBuffer.unmap();
    console.log( new Float32Array( data ) );

    console.log( { device, shaderModule, output, stagingBuffer, bindGroupLayout, bindGroup, computePipeline, commandEncoder, passEncoder } );

    return async () => {
        console.log( "HELLO WEBGPU" );
    }

}
