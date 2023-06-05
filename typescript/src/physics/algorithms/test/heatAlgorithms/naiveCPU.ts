import { MaterialLookup } from "../../../VoxelMaterial.js";
import { applyHeat, calculateHeat } from "../../heatTransfer.js";
import { HeatTransferVolumeType } from "../algorithms.test.js";

export async function naiveCPU( v: HeatTransferVolumeType, materials: MaterialLookup, timeStep: number ) {
    //  no init needed
    return async () => {
        calculateHeat( v, materials );
        applyHeat( v, materials, timeStep );
    }
}
