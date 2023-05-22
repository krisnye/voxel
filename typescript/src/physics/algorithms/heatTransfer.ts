import { Volume } from "../Volume.js";

export function calculateHeat(
    volume: Volume<{
        material: Uint8Array,
        temperature: Float32Array,
        heat: Float32Array
    }>) {
    console.log(volume);
}
