import { VolumePipeline } from "../../../../gpu/GPUVolumePipeline.js";

export const sharedFunctions = /* wgsl */`
const MaterialProperty_mass = 0;
const MaterialProperty_thermalResistance = 1;
const MaterialProperty_heatCapacity = 2;
const MaterialProperty_count = 3;
fn getMaterialProperty(materialId: u32, property: u32) -> f32 {
    return lookup[materialId * MaterialProperty_count + property];
}
fn getIndex(num_workgroups: vec3u, id: vec3u) -> u32 {
    return (id.z * num_workgroups.y + id.y) * num_workgroups.x + id.x;
}
`;

export function createCalculateHeatVolumePipeline( device: GPUDevice ) {
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
fn calculateVoxelHeat(
    num_workgroups : vec3u,
    id: vec3u,
    dx: i32, dy: i32, dz: i32,
) -> f32 {
    let ix = i32(id.x) + dx;
    let iy = i32(id.y) + dy;
    let iz = i32(id.z) + dz;
    if (ix < 0 || ix >= i32(num_workgroups.x) || iy < 0 || iy >= i32(num_workgroups.y) || iz < 0 || iz >= i32(num_workgroups.z)) {
        return 0.0f;
    }
    let fromIndex = getIndex(num_workgroups, vec3u(u32(ix), u32(iy), u32(iz)));
    let toIndex = getIndex(num_workgroups, id);
    let temperatureFrom = temperature[fromIndex];
    let temperatureTo = temperature[toIndex];
    let materialIdFrom = material[fromIndex];
    let materialIdTo = material[toIndex];
    let materialFromMass = getMaterialProperty( materialIdFrom, MaterialProperty_mass );
    let materialToMass = getMaterialProperty( materialIdTo, MaterialProperty_mass );
    if ( materialFromMass == 0.0f || materialToMass == 0.0f ) {
        return 0.0f;
    }
    let materialFromThermalResistance = getMaterialProperty( materialIdFrom, MaterialProperty_thermalResistance );
    let materialToThermalResistance = getMaterialProperty( materialIdTo, MaterialProperty_thermalResistance );
    //  resistance in series.
    let thermalResistance = materialFromThermalResistance + materialToThermalResistance;
    //  heat transfer is directly proportional to the temperature difference.
    let temperatureDifference = temperatureFrom - temperatureTo;
    //  heat transfer is inversely proportional to thermal resistance.
    let heatTransferRate = temperatureDifference / thermalResistance;
    return heatTransferRate;
}

@compute @workgroup_size(1)
fn main(
    @builtin(workgroup_id) workgroup_id : vec3u,
    @builtin(num_workgroups) num_workgroups : vec3u,
) {
    //  this should give me index into volume data
    let index = getIndex(num_workgroups, workgroup_id);
    let materialIdTo = material[ index ];
    let temperatureTo = temperature[ index ];
    heat[index]
        = calculateVoxelHeat(num_workgroups, workgroup_id, -1, 0, 0)
        + calculateVoxelHeat(num_workgroups, workgroup_id,  1, 0, 0)
        + calculateVoxelHeat(num_workgroups, workgroup_id,  0,-1, 0)
        + calculateVoxelHeat(num_workgroups, workgroup_id,  0, 1, 0)
        + calculateVoxelHeat(num_workgroups, workgroup_id,  0, 0,-1)
        + calculateVoxelHeat(num_workgroups, workgroup_id,  0, 0, 1);
}
    `} );
}