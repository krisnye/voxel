import { MaterialLookup } from "../../../VoxelMaterial.js";
import { applyHeat, calculateHeat } from "../../heatTransfer.js";
import { HeatTransferVolumeType } from "../algorithms.test.js";

export async function naiveCPU( v: HeatTransferVolumeType, materials: MaterialLookup, timeStep: number, count: number ) {
    //  no init needed
    return async () => {
        for ( let i = 0; i < count; i++ ) {
            calculateHeat( v, materials );
            applyHeat( v, materials, timeStep );
        }
    }
}
