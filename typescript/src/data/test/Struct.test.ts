import { strict as assert } from "assert";
import { F32 } from "../Primitive.js";
import { Struct } from "../Struct.js";

const Vector3 = Struct.createClass( "Vector3", { x: F32, y: F32, z: F32, } );
type Vector3T = InstanceType<typeof Vector3>;

const vector: Vector3T = new Vector3( { x: 0, y: 0, z: 0, } );
const vector2 = vector.patch( { x: 10, y: 20 } );

assert.deepEqual( vector2, new Vector3( { x: 10, y: 20, z: 0 } ) );

// let va!: StructArray<typeof Vector3.definition>;
//     // va.getX(0);
//     // va.getY(0);
