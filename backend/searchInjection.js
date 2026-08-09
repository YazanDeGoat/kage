import { buildSearchContext } from "./searchContext.js";


function clean(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(/\s+/g, " ")
        .trim();

}


export async function injectSearchContext(
    prompt
) {

    const cleanPrompt =
        clean(prompt);


    if (!cleanPrompt) {

        return {

            success: false,

            prompt: "",

            context: "",

            results: []

        };

    }


    try {

        const search =
            await buildSearchContext(
                cleanPrompt
            );


        if (
            !search ||
            !search.success ||
            !search.context
        ) {

            return {

                success: false,

                prompt: cleanPrompt,

                context: "",

                results:
                    search?.results || []

            };

        }


        const context = [

            "KAGE WEB SEARCH CONTEXT",

            "Use the following search information only when it is relevant to the user's request.",

            "Do not claim that you searched if the context does not support that claim.",

            "Prefer the supplied search information for current or time-sensitive facts.",

            "",

            search.context

        ].join("\n");


        return {

            success: true,

            prompt: cleanPrompt,

            context,

            results:
                search.results || []

        };

    }

    catch (error) {

        console.error(
            "KAGE SEARCH INJECTION ERROR:",
            error
        );


        return {

            success: false,

            prompt: cleanPrompt,

            context: "",

            results: [],

            error:
                error?.message ||
                "search injection failed"

        };

    }

}


export function buildPromptWithSearch(
    prompt,
    searchContext = ""
) {

    const cleanPrompt =
        clean(prompt);


    const cleanContext =
        clean(searchContext);


    if (!cleanContext) {

        return cleanPrompt;

    }


    return [

        cleanContext,

        "",

        "USER REQUEST:",

        cleanPrompt

    ].join("\n");

}
