import { Volume } from "../../data/Volume.js";

export function calculateHeat(
    volume: Volume<{
        material: Uint8Array,
        temperature: Float32Array,
        heat: Float32Array
    }>
) {
    // traverse all the things.
    console.log(volume);
}

//  delta dx, dy, dz
