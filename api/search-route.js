import {
    routeSearch
} from "../backend/searchRouter.js";


function response(
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

        return response(

            {

                success: false,

                error:
                    "method not allowed"

            },

            405

        );

    }


    const url =
        new URL(req.url);


    const prompt =
        url.searchParams.get(
            "q"
        );


    if (!prompt) {

        return response(

            {

                success: false,

                error:
                    "missing q parameter"

            },

            400

        );

    }


    const result =
        routeSearch(
            prompt
        );


    return response({

        success: true,

        prompt,

        search:
            result.search,

        query:
            result.query

    });

}
