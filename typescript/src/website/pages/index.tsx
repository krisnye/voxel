import { KrisPage } from "./kris.js";
import { KodyPage } from "./kody.js";
import { JSX } from "preact/jsx-runtime";

interface Page {
    name: string,
    component: () => JSX.Element
}

export const pages: Record<string, Page> = Object.fromEntries( Object.entries( {
    kris: {
        name: "Kris",
        component: KrisPage,
    },
    kody: {
        name: "Kody",
        component: KodyPage,
    },
} ) );

