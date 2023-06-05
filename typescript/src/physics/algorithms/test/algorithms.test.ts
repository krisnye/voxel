import { Volume } from "../../../data/Volume.js";
import { MaterialLookup, VoxelMaterial, toVoxelMaterialLookupVolume } from "../../VoxelMaterial.js";
import { Kelvin } from "../../constants.js";
import { materials } from "../../materials.js";
import { addCornerHeatSourceAndSink, fillWithTestMaterial } from "../fillWithTestMaterial.js";
import { algorithms } from "./heatAlgorithms/index.js";


const useBig = true;
const size: [ number, number, number ] = useBig ? [ 256, 256, 256 ] : [ 4, 1, 4 ];

export const decimeterVoxelMaterials = toVoxelMaterialLookupVolume( materials, 0.1 );
console.log( decimeterVoxelMaterials.toString() );
export type HeatTransferVolumeType = Volume<{
    material: "u8";
    temperature: "f32";
    heat: "f32";
}>;

export type TestAlgorithm = ( v: HeatTransferVolumeType, materials: MaterialLookup, timeStep: number ) => Promise<null | ( () => Promise<void> )>;

export async function runTests() {
    const timeStep = 1 / 30;
    const volume = Volume.create( size, { material: "u8", temperature: "f32", heat: "f32" } );
    function resetVolume() {
        fillWithTestMaterial( volume );
        //  add some temperature to one of the locations, the rest are at absolute zero.
        volume.data.temperature.fill( Kelvin.roomTemperature );
        addCornerHeatSourceAndSink( volume );
    }


    const iterations = 1;
    for ( const [ name, algorithm ] of Object.entries( algorithms ) ) {
        resetVolume();
        const runOnce = await algorithm( volume, decimeterVoxelMaterials, timeStep );
        if ( !runOnce ) {
            console.log( `############## ${ name } => Skipping ##############\n` );
            continue;
        }
        const start = performance.now();
        for ( let i = 0; i < iterations; i++ ) {
            await runOnce();
        }
        const finish = performance.now();
        console.log( `############## ${ name } => ${ Math.round( finish - start ) }ms ##############\n` );
        if ( volume.data.material.length < 100 ) {
            console.log( volume.toString() );
        }
    }
}

if ( typeof window === "undefined" ) {
    runTests();
}



