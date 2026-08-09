import {
    routeSearch
} from "../backend/searchRouter.js";

import {
    search
} from "../backend/providers/searchProvider.js";


function send(
    res,
    status,
    data
) {

    res.statusCode =
        status;

    res.setHeader(
        "Content-Type",
        "application/json"
    );

    res.end(
        JSON.stringify(data)
    );

}


export default async function handler(
    req,
    res
) {

    try {

        if (
            req.method !== "GET" &&
            req.method !== "POST"
        ) {

            return send(

                res,

                405,

                {

                    success: false,

                    error:
                        "method not allowed"

                }

            );

        }


        let prompt = "";


        if (
            req.method === "GET"
        ) {

            prompt =
                req.query?.q ||
                "";

        }


        if (
            req.method === "POST"
        ) {

            let body =
                req.body;


            if (
                typeof body === "string"
            ) {

                try {

                    body =
                        JSON.parse(body);

                }

                catch {

                    body = {};

                }

            }


            prompt =
                body?.prompt ||
                body?.query ||
                "";

        }


        prompt =
            String(prompt)
                .trim();


        if (!prompt) {

            return send(

                res,

                400,

                {

                    success: false,

                    error:
                        "missing search query"

                }

            );

        }


        const routing =
            routeSearch(prompt);


        if (
            !routing.search
        ) {

            return send(

                res,

                200,

                {

                    success: true,

                    search: false,

                    query: prompt,

                    results: []

                }

            );

        }


        console.log(
            "KAGE SEARCH QUERY:",
            prompt
        );


        const result =
            await search(
                prompt,
                []
            );


        if (!result) {

            return send(

                res,

                502,

                {

                    success: false,

                    search: true,

                    query: prompt,

                    error:
                        "search provider returned no result",

                    results: []

                }

            );

        }


        const results =
            Array.isArray(
                result.data
            )

            ? result.data

            : result.data
                ? [result.data]
                : [];


        return send(

            res,

            200,

            {

                success:
                    result.success === true,

                search: true,

                query: prompt,

                text:
                    result.text || "",

                results

            }

        );

    }

    catch (error) {

        console.error(
            "KAGE SEARCH API ERROR:",
            error
        );


        return send(

            res,

            500,

            {

                success: false,

                search: true,

                error:
                    error?.message ||
                    "search failed",

                results: []

            }

        );

    }

}
