import { VoxelMaterial } from "../../../VoxelMaterial.js";
import { HeatTransferVolumeType } from "../algorithms.test.js";

declare global {
    interface GPUDevice {
        foo(): boolean;
    }
}

//  so, how compute shaders work.
//  shader defines constant 3d problem space A: uvec3 (gl_LocalInvocationID)
//  dispatch call passes 3d problem space B: uvec3 (gl_WorkGroupID)
//  shader is called with A * B invocation counts.
//  signature call(gl_WorkGroupID: uvec3, gl_LocalInvocationID: uvec3) => void
//  up to call to determine what to read and what to write.
//  for most 3d computations we are interested in we only need one problem space so we can set other to uvec3(1,1,1)

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

//  workgroup_size is vec3 and determines local_invocation_id range
@compute @workgroup_size(64, 1, 1)
fn main(
  // gl_GlobalInvocationID
  //  This value uniquely identifies this particular invocation of the compute shader among all invocations of this compute dispatch call. It's a short-hand for the math computation:
  //  gl_WorkGroupID * gl_WorkGroupSize + gl_LocalInvocationID;
  //    this will normally not be very useful to us
  //    they are just using it here to write outputs to an array.
  @builtin(global_invocation_id)
  global_id : vec3u,

  @builtin(local_invocation_id)
  local_id : vec3u,
) {
  // Avoid accessing the buffer out of bounds
  if (global_id.x >= ${ BUFFER_SIZE }) {
    return;
  }

  output[global_id.x] =
    f32(global_id.x) * 100000.0 + f32(local_id.y) * 100.0 + f32(local_id.x);
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
    // dispatch workGroups determines the number of calls
    //  total calls to shader = local workgroup size * dispatch global workgroup size
    //  in this sample, the are using BUFFER_SIZE / 64 because the local workgroup size is uvec3(64,1,1)
    //  so the total invocations will equal the buffer size which they write to.
    passEncoder.dispatchWorkgroups( Math.ceil( BUFFER_SIZE / 64 ), 1, 1 );
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
