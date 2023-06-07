import { VolumePipeline } from "../../../../gpu/GPUVolumePipeline.js";
import { sharedFunctions } from "./webGPU_calculateHeat.js";

export function createApplyHeatVolumePipeline( device: GPUDevice ) {
    // create volume gpu pipeline
    return VolumePipeline.create( device, {
        bindings: {
            material: "u32",
            temperature: "f32",
            heat: "f32",
            lookup: "f32",
        },
        shader: /* wgsl */`
${ sharedFunctions }
const time = 0.03333333333333333f;
@compute @workgroup_size(1)
fn main(
    @builtin(workgroup_id) workgroup_id : vec3u,
    @builtin(num_workgroups) num_workgroups : vec3u,
) {
    //  this should give me index into volume data
    let index = getIndex(num_workgroups, workgroup_id);
    let materialId = material[ index ];

    let materialMass = getMaterialProperty( materialId, MaterialProperty_mass );
    if ( materialMass == 0.0f ) {
        return;
    }
    let voxelHeatCapacity = getMaterialProperty(materialId, MaterialProperty_heatCapacity );
    let voxelHeat = heat[ index ];
    //  heat is power, power * time = energy
    let heatEnergy = voxelHeat * time;
    //  energy / heatCapacity = temperature change in kelvin
    let temperatureChange = heatEnergy / voxelHeatCapacity;
    temperature[ index ] += temperatureChange;
}
    `} );
}