import {
    getCustomization
} from "./customization.js";

import {
    buildKAGESystemPrompt
} from "./systemPrompt.js";


export function createKAGERuntime(
    options = {}
) {

    const customization =
        options.customization ||
        getCustomization();


    const systemPrompt =
        buildKAGESystemPrompt({
            customization
        });


    return {

        name: "kage",

        version: "1.0.0",

        customization,

        systemPrompt

    };

}


export function getKAGESystemInstructions(
    options = {}
) {

    const runtime =
        createKAGERuntime(
            options
        );


    return runtime.systemPrompt;

}


export function getKAGEConfiguration(
    options = {}
) {

    const runtime =
        createKAGERuntime(
            options
        );


    return {

        name:
            runtime.name,

        version:
            runtime.version,

        customization:
            runtime.customization,

        systemPrompt:
            runtime.systemPrompt

    };

}
