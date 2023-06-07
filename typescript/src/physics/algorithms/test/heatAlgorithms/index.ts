import { TestAlgorithm } from "../algorithms.test";
import { naiveCPU } from "./naiveCPU.js";
import { webGPU } from "./webGPU.js";

export const algorithms = { /*naiveCPU,*/ webGPU } satisfies Record<string, TestAlgorithm>;
