import {
    Scene, MeshBuilder, Vector3, Material,
    BoundingBox, Camera, Matrix
} from "@babylonjs/core"
import { groupNodes } from "../babylonjs/BabylonUtils"


/**
 * Renders a voxel material with either a bounding mesh or an inverted cube around the camera, depending on if the camera is within the chunk or not.
 */
export default function voxelChunkNode( name: string, material: Material, camera: Camera, scene: Scene ) {

    // Mesh used to draw voxels when camera is outside the volume.
    const voxelBoundingMesh = MeshBuilder.CreateBox( "VoxelBoundingBox", { size: 1.1 } )
    voxelBoundingMesh.material = material
    // voxelBoundingMesh.showBoundingBox = true

    // Mesh used to draw voxels when camera is inside the volume.
    const invertedVoxelMeshOptions = { size: camera.minZ * 3, sideOrientation: Material.CounterClockWiseSideOrientation }
    const invertedVoxelMesh = MeshBuilder.CreateBox( "InvertedVoxelMesh", invertedVoxelMeshOptions )
    invertedVoxelMesh.material = material
    // invertedVoxelMesh.showBoundingBox = true

    const group = groupNodes( name, voxelBoundingMesh, invertedVoxelMesh )

    const pad = camera.minZ * 2
    const pad3f = new Vector3( pad, pad, pad )
    const paddedBoundingBox = new BoundingBox( new Vector3(), new Vector3(), undefined )

    const groupToWorldMat = new Matrix()
    const renderObserver = scene.onBeforeRenderObservable.add( () => {

        const boundingBox = voxelBoundingMesh.getBoundingInfo().boundingBox
        // We need to pad the bounding box because the camera might be within the near clipping distance of the bounding volume,
        // which could cause a flicker when entering the volume.
        paddedBoundingBox.reConstruct(
            boundingBox.minimum.subtractToRef( pad3f, paddedBoundingBox.minimum ),
            boundingBox.maximum.addToRef( pad3f, paddedBoundingBox.maximum ),
            boundingBox.getWorldMatrix()
        )

        const cameraInVoxelMesh = paddedBoundingBox.intersectsPoint( camera.position )
        if ( cameraInVoxelMesh ) {
            group.computeWorldMatrix( true ).invertToRef( groupToWorldMat )
            Vector3.TransformCoordinatesToRef( camera.position, groupToWorldMat, invertedVoxelMesh.position )
            invertedVoxelMesh.isVisible = true
            voxelBoundingMesh.isVisible = false
        } else {
            invertedVoxelMesh.isVisible = false
            voxelBoundingMesh.isVisible = true
        }

    } )

    group.onDisposeObservable.add( () => {
        scene.onBeforeRenderObservable.remove( renderObserver )
    } )

    return group

}