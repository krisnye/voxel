import { strict as assert } from "assert";
import { F32 } from "../Primitive.js";
import { Struct } from "../Struct.js";

const Vector3 = Struct.createClass("Vector3", {
    x: F32,
    y: F32,
    z: F32,
});
export type Vector3T = InstanceType<typeof Vector3>;

export const vector: Vector3T = new Vector3({ x: 0, y: 0, z: 0, });
export const vector2 = vector.patch({ x: 10, y: 20 });

assert.deepEqual(vector2, new Vector3({ x: 10, y: 20, z: 0 }));

console.log(vector, vector2);


