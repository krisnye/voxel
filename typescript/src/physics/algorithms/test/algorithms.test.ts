import { Volume } from "../../../data/Volume.js";
import { toVoxelMaterials } from "../../VoxelMaterial.js";
import { materials } from "../../materials.js";
import { fillWithTestMaterial } from "../fillWithTestMaterial.js";
import { calculateHeat } from "../heatTransfer.js";

const volume = Volume.create([4, 1, 4], { material: Uint8Array, temperature: Float32Array, heat: Float32Array });
fillWithTestMaterial(volume);
const decimeterVoxelMaterials = toVoxelMaterials(materials, 0.1);

//  add some temperature to one of the locations, the rest are at absolute zero.
volume.data.temperature[0] = 1000.0;
calculateHeat(volume, decimeterVoxelMaterials);

console.log(volume.data);
