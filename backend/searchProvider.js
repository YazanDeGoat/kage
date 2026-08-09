const SEARCH_API =
    "https://api.tavily.com/search";


function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


export async function searchWeb(
    query
) {

    const text =
        clean(query);


    if (!text) {

        return {

            success: false,

            text: "search query is empty",

            results: []

        };

    }


    const apiKey =
        process.env.KAGE_SEARCH_API_KEY;


    if (!apiKey) {

        return {

            success: false,

            text: "search provider is not configured",

            results: []

        };

    }


    try {

        const response =
            await fetch(
                SEARCH_API,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            api_key:
                                apiKey,

                            query:
                                text,

                            search_depth:
                                "basic",

                            max_results:
                                5,

                            include_answer:
                                true

                        })

                }
            );


        const raw =
            await response.text();


        if (!response.ok) {

            return {

                success: false,

                text:
                    "search provider error",

                results: []

            };

        }


        let data;

        try {

            data =
                JSON.parse(raw);

        } catch {

            return {

                success: false,

                text:
                    "invalid search response",

                results: []

            };

        }


        const results =
            Array.isArray(
                data.results
            )

                ? data.results.map(
                    item => ({

                        title:
                            item.title || "",

                        url:
                            item.url || "",

                        content:
                            item.content || ""

                    })
                )

                : [];


        return {

            success: true,

            text:
                data.answer ||
                "search completed",

            results

        };

    }

    catch (error) {

        console.log(
            "SEARCH ERROR:",
            error
        );


        return {

            success: false,

            text:
                "search connection failed",

            results: []

        };

    }

}
