import { F32, Primitive } from "./Primitive";
import { StringKeyOf } from "./types";

type StructDefinition = {
    [name: string]: Primitive<number | bigint>;
}

type StructValues<SD extends StructDefinition> = {
    readonly [name in StringKeyOf<SD>]: SD[name]["min"];
};

export class Struct {

    static createClass<SD extends StructDefinition>(sd: SD): new (sd: StructValues<SD>) => StructInstance<SD> {
        return null as any;
    }

}

export type StructInstance<SD extends StructDefinition> = StructValues<SD> & {
    patch(sd: Partial<StructValues<SD>>): StructInstance<SD>;
}

const Vector3 = Struct.createClass({
    x: F32,
    y: F32,
    z: F32,
});
export type Vector3T = InstanceType<typeof Vector3>;

export const vector: Vector3T = new Vector3({ x: 0, y: 0, z: 0, });


