import { search } from "./providers/searchProvider.js";


function cleanText(value) {

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


function normalizeResult(result, index) {

    if (!result) {

        return null;

    }


    if (typeof result === "string") {

        return {

            title:
                `result ${index + 1}`,

            url:
                "",

            snippet:
                cleanText(result)

        };

    }


    const title =
        cleanText(
            result.title ||
            result.name ||
            result.heading ||
            `result ${index + 1}`
        );


    const url =
        cleanText(
            result.url ||
            result.link ||
            result.href ||
            ""
        );


    const snippet =
        cleanText(
            result.snippet ||
            result.description ||
            result.text ||
            result.content ||
            ""
        );


    return {

        title,

        url,

        snippet

    };

}


function getResults(result) {

    if (!result) {

        return [];

    }


    if (
        Array.isArray(
            result.results
        )
    ) {

        return result.results;

    }


    if (
        Array.isArray(
            result.data
        )
    ) {

        return result.data;

    }


    if (
        result.data
    ) {

        return [
            result.data
        ];

    }


    return [];

}


export async function buildSearchContext(
    prompt
) {

    const query =
        cleanText(prompt);


    if (!query) {

        return {

            success: false,

            query: "",

            results: [],

            context: ""

        };

    }


    try {

        console.log(
            "KAGE SEARCH CONTEXT QUERY:",
            query
        );


        const result =
            await search(
                query,
                []
            );


        if (!result) {

            return {

                success: false,

                query,

                results: [],

                context: ""

            };

        }


        const rawResults =
            getResults(result);


        const results =
            rawResults

                .map(
                    normalizeResult
                )

                .filter(
                    Boolean
                )

                .filter(
                    item =>
                        item.snippet ||
                        item.title
                )

                .slice(
                    0,
                    8
                );


        const context =
            results
                .map(
                    (item, index) => {

                        const source =
                            item.url
                                ? `URL: ${item.url}`
                                : "";

                        return [

                            `[SEARCH RESULT ${index + 1}]`,

                            `TITLE: ${item.title}`,

                            `CONTENT: ${item.snippet}`,

                            source

                        ]

                            .filter(Boolean)

                            .join("\n");

                    }
                )

                .join("\n\n");


        return {

            success:
                result.success !== false,

            query,

            results,

            context

        };

    }

    catch (error) {

        console.error(
            "KAGE SEARCH CONTEXT ERROR:",
            error
        );


        return {

            success: false,

            query,

            results: [],

            context: "",

            error:
                error?.message ||
                "search context failed"

        };

    }

}
