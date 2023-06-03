
export type StringKeyOf<T extends object> = Extract<keyof T, string>;

export function stringKeys<T extends object>( object: T ): StringKeyOf<T>[] {
    return Object.keys( object ).filter( value => typeof value === "string" ) as StringKeyOf<T>[];
}

export function stringEntries<T extends object>( object: T ): [ StringKeyOf<T>, T[ StringKeyOf<T> ] ][] {
    return stringKeys( object ).map( name => [ name, object[ name ] ] );
}