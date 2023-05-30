import { VoxelMaterial } from "../../../VoxelMaterial.js";
import { HeatTransferVolumeType } from "../algorithms.test.js";

export async function webGPU(v: HeatTransferVolumeType, materials: VoxelMaterial[], timeStep: number) {
    // init here.
    if (!globalThis.navigator) {
        console.log(`NOT IN BROWSER`);
        throw new Error(`Not in browser`);
    }
    if (!navigator.gpu) {
        console.error(`NO GPU FOR YOU`);
        throw Error("WebGPU not supported.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        console.error(`NO ADAPTER FOR YOU`);
        throw Error("Couldn't request WebGPU adapter.");
    }

    const device = await adapter.requestDevice();
    console.log(`WEBGPU DEVICE`, device);
    return async () => {
        console.log("HELLO WEBGPU");
    }

}
