import { Primitive } from "./Primitive.js";
import { StringKeyOf } from "./types.js";

type StructFieldDefinition = Primitive<number | bigint> | StructClass;

type StructDefinition = {
    [name: string]: StructFieldDefinition;
}

type StructFieldType<SFD extends StructFieldDefinition> =
    SFD extends StructClass<infer SDC>
        ? StructInstance<SDC>
        : SFD extends Primitive
            ? SFD["min"]
            : never;

type StructValues<SD extends StructDefinition> = {
    readonly [name in StringKeyOf<SD>]: StructFieldType<SD[name]>
};

export type StructClass<SD extends StructDefinition = StructDefinition> = {
    definition: SD;
    new (sd: StructValues<SD>): StructInstance<SD>;
}

export type StructInstance<SD extends StructDefinition> = StructValues<SD> & {
    patch(sd: Partial<StructValues<SD>>): StructInstance<SD>;
}

export type StructArrayType<SD extends StructDefinition> = {
    length: number,
    get(index: number): StructInstance<SD>,
    set(index: number, value: StructInstance<SD>): StructInstance<SD>
}
//  & {
//     [Name in keyof SD as `get${Capitalize<string & Name>}`]: (index: number) => StructFieldType<SD[Name]>;
// } & {
//     [Name in keyof SD as `set${Capitalize<string & Name>}`]: (index: number, value: StructFieldType<SD[Name]>) => StructFieldType<SD[Name]>;
// }
;

export abstract class StructArray<SD extends StructDefinition> {

    constructor() {}

    abstract get(index: number): StructInstance<SD>;
    abstract set(index: number, value: StructInstance<SD>): StructInstance<SD>;

}

export class Struct {

    static createClass<SD extends StructDefinition>(name: string, definition: SD): StructClass<SD> {
        const code =
`(class ${name} extends Struct {
    constructor(values) {
        super();
        for (let name in values) {
            this[name] = values[name];
        }
    }
    patch(values) {
        return new this.constructor({ ...this, ...values });
    }
})`;
        const clazz = eval(code);
        clazz.definition = definition;
        return clazz;
    }

}


