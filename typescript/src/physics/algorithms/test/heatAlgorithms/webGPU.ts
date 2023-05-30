import { VoxelMaterial } from "../../../VoxelMaterial.js";
import { HeatTransferVolumeType } from "../algorithms.test.js";

export async function webGPU(v: HeatTransferVolumeType, materials: VoxelMaterial[], timeStep: number) {
    // init here.
    if (!globalThis.navigator) {
        throw new Error(`Not in browser`);
    }
    if (!navigator.gpu) {
        throw Error("WebGPU not supported.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error("Couldn't request WebGPU adapter.");
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
  if (global_id.x >= ${BUFFER_SIZE}) {
    return;
  }

  output[global_id.x] =
    f32(global_id.x) * 1000. + f32(local_id.x);
}
`

    const shaderModule = device.createShaderModule({
        code: shader,
    });

    const output = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const stagingBuffer = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    console.log({ device, shaderModule, output, stagingBuffer });

    return async () => {
        console.log("HELLO WEBGPU");
    }

}
