import { Primitive } from "./Primitive";
import { StringKeyOf } from "./types";

type StructDefinition = {
    [name: string]: Primitive<number | bigint>;
}

type StructValues<SD extends StructDefinition> = {
    readonly [name in StringKeyOf<SD>]: SD[name]["min"];
};

export type StructClass<SD extends StructDefinition> = {
    definition: SD;
    new (sd: StructValues<SD>): StructInstance<SD>
}

export type StructInstance<SD extends StructDefinition> = StructValues<SD> & {
    patch(sd: Partial<StructValues<SD>>): StructInstance<SD>;
}

export class Struct {

    static createClass<SD extends StructDefinition>(name: string, definition: SD): StructClass<SD> {
        const code =
`(class ${name} {
    constructor(values) {
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


