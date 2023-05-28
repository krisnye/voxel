import { Volume } from "../../../data/Volume.js";
import { toVoxelMaterials } from "../../VoxelMaterial.js";
import { Kelvin } from "../../constants.js";
import { materials } from "../../materials.js";
import { addCornerHeatSourceAndSink, fillWithTestMaterial } from "../fillWithTestMaterial.js";
import { applyHeat, calculateHeat } from "../heatTransfer.js";

const useBig = true;
const size: [number, number, number] = useBig ? [256, 256, 256] : [4, 1, 4];


const volume = Volume.create(size, { material: Uint8Array, temperature: Float32Array, heat: Float32Array });
const decimeterVoxelMaterials = toVoxelMaterials(materials, 0.1);
const timeStep = 1 / 30;
function resetVolume() {
    fillWithTestMaterial(volume);
    //  add some temperature to one of the locations, the rest are at absolute zero.
    volume.data.temperature.fill(Kelvin.roomTemperature);
    addCornerHeatSourceAndSink(volume);
}

resetVolume();

type TestAlgorithm = (v: typeof volume, timeStep: number) => void;

function naiveCPU(v: typeof volume, timeStep: number) {
    calculateHeat(v, decimeterVoxelMaterials);
    applyHeat(v, decimeterVoxelMaterials, timeStep);
}

const algorithms = { naiveCPU } satisfies Record<string,TestAlgorithm>;

const iterations = 10;
for (const [name, algorithm] of Object.entries(algorithms)) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        algorithm(volume, timeStep);
    }
    const finish = performance.now();
    console.log(`############## ${name} => ${Math.round(finish - start)}ms ##############\n`);
    if (volume.data.material.length < 100) {
        console.log(volume.toString());
    }
}

