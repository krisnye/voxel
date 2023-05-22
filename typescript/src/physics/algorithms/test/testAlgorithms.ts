import { Volume } from "../../Volume.js";
import { fillWithTestMaterial } from "../fillWithTestMaterial.js";

const volume = Volume.create([4, 1, 4], { material: Uint8Array, temperature: Float32Array });
fillWithTestMaterial(volume);

console.log(volume.data.material, volume.data.temperature);
