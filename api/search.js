import {
    searchWeb
} from "../backend/searchProvider.js";


function json(
    data,
    status = 200
) {

    return new Response(

        JSON.stringify(data),

        {

            status,

            headers: {

                "Content-Type":
                    "application/json"

            }

        }

    );

}


export default async function handler(
    req
) {

    if (
        req.method !== "GET"
    ) {

        return json(

            {

                success: false,

                text:
                    "method not allowed",

                results: []

            },

            405

        );

    }


    const url =
        new URL(req.url);


    const query =
        url.searchParams.get(
            "q"
        );


    if (!query) {

        return json(

            {

                success: false,

                text:
                    "missing search query",

                results: []

            },

            400

        );

    }


    const result =
        await searchWeb(
            query
        );


    return json(
        result
    );

}
