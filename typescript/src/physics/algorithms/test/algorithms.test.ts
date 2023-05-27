import { Volume } from "../../../data/Volume.js";
import { toVoxelMaterials } from "../../VoxelMaterial.js";
import { Kelvin } from "../../constants.js";
import { materials } from "../../materials.js";
import { fillWithTestMaterial } from "../fillWithTestMaterial.js";
import { applyHeat, calculateHeat, totalHeatEnergy } from "../heatTransfer.js";

const volume = Volume.create([4, 1, 4], { material: Uint8Array, temperature: Float32Array, heat: Float32Array });
fillWithTestMaterial(volume);
const decimeterVoxelMaterials = toVoxelMaterials(materials, 0.1);

//  add some temperature to one of the locations, the rest are at absolute zero.
volume.data.temperature.fill(Kelvin.room);
volume.data.temperature[0] = 1000.0;
const timeStep = 1 / 30;
const iterations = 20;
const heatEnergyBefore = totalHeatEnergy(volume, decimeterVoxelMaterials);
for (let i = 0; i < iterations; i++) {
    calculateHeat(volume, decimeterVoxelMaterials);
    applyHeat(volume, decimeterVoxelMaterials, timeStep);
}
const heatEnergyAfter = totalHeatEnergy(volume, decimeterVoxelMaterials);
console.log(volume.data);
console.log({ heatEnergyBefore, heatEnergyAfter });
