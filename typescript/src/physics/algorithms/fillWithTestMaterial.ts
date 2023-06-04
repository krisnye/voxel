import { X, Y, Z } from "../../math/types.js";
import { Volume } from "../../data/Volume.js";
import { materials } from "../materials.js";
import { Kelvin } from "../constants.js";

export function fillWithTestMaterial( volume: Volume<{ material: "U8" }> ) {
    const { size } = volume;
    const alternateMaterials = [ materials.rock, materials.iron, materials.woodHard, materials.dirt ];
    //  fill bottom half with rock, top with air
    let index = 0;
    for ( let z = 0; z < size[ Z ]; z++ ) {
        for ( let y = 0; y < size[ Y ]; y++ ) {
            for ( let x = 0; x < size[ X ]; x++ ) {
                volume.data.material[ index ] = alternateMaterials[ x % alternateMaterials.length ].id;
                index++;
            }
        }
    }
    //  todo, add more interesting materials and shapes.
    return volume;
}

export function addCornerHeatSourceAndSink( volume: Volume<{ material: "U8", temperature: "F32" }> ) {
    let hot = 0;
    let cold = volume.data.material.length - 1;
    volume.data.material[ hot ] = volume.data.material[ cold ] = materials.infiniteHeatCapacity.id;
    volume.data.temperature[ hot ] = Kelvin.tungstenMelting;
    volume.data.temperature[ cold ] = Kelvin.absoluteZero;
}
