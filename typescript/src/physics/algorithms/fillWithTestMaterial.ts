import { X, Y, Z } from "../../math/types.js";
import { Volume } from "../../data/Volume.js";
import { materials } from "../materials.js";

export function fillWithTestMaterial(volume: Volume<{ material: Uint8Array }>) {
    const { size } = volume;
    //  fill bottom half with rock, top with air
    let index = 0;
    for (let z = 0; z < size[Z]; z++) {
        for (let y = 0; y < size[Y]; y++) {
            for (let x = 0; x < size[X]; x++) {
                const bottomHalf = z * 2 <= size[Z];
                volume.data.material[index] = bottomHalf ? materials.rock.id : materials.air.id;
                index++;
            }
        }
    }
    //  todo, add more interesting materials and shapes.
    return volume;
}