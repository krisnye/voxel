import { Volume } from "../../../data/Volume.js";
import { toVoxelMaterials } from "../../VoxelMaterial.js";
import { materials } from "../../materials.js";
import { fillWithTestMaterial } from "../fillWithTestMaterial.js";

const volume = Volume.create([4, 1, 4], { material: Uint8Array, temperature: Float32Array });
fillWithTestMaterial(volume);

console.log(volume.data.material, volume.data.temperature);

const decimeterVoxelMaterials = toVoxelMaterials(materials, 0.1);

console.log({ decimeterVoxelMaterials });