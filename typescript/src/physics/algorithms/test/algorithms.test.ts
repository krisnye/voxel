import { Volume } from "../../../data/Volume.js";
import { VoxelMaterial, toVoxelMaterials } from "../../VoxelMaterial.js";
import { Kelvin } from "../../constants.js";
import { materials } from "../../materials.js";
import { addCornerHeatSourceAndSink, fillWithTestMaterial } from "../fillWithTestMaterial.js";
import { algorithms } from "./heatAlgorithms/index.js";


const useBig = true;
const size: [number, number, number] = useBig ? [256, 256, 256] : [4, 1, 4];


export const decimeterVoxelMaterials = toVoxelMaterials(materials, 0.1);
export type HeatTransferVolumeType = Volume<{
    material: Uint8Array;
    temperature: Float32Array;
    heat: Float32Array;
}>;

export type TestAlgorithm = (v: HeatTransferVolumeType, materials: VoxelMaterial[], timeStep: number) => Promise<() => Promise<void>>;

async function runTests() {
    const timeStep = 1 / 30;
    const volume = Volume.create(size, { material: Uint8Array, temperature: Float32Array, heat: Float32Array });
    function resetVolume() {
        fillWithTestMaterial(volume);
        //  add some temperature to one of the locations, the rest are at absolute zero.
        volume.data.temperature.fill(Kelvin.roomTemperature);
        addCornerHeatSourceAndSink(volume);
    }


    const iterations = 1;
    for (const [name, algorithm] of Object.entries(algorithms)) {
        resetVolume();
        const runOnce = await algorithm(volume, decimeterVoxelMaterials, timeStep);
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            await runOnce();
        }
        const finish = performance.now();
        console.log(`############## ${name} => ${Math.round(finish - start)}ms ##############\n`);
        if (volume.data.material.length < 100) {
            console.log(volume.toString());
        }
    }
}

runTests();


