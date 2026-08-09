import {
    buildSearchContext
} from "../backend/searchContext.js";


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


        const result =
            await buildSearchContext(
                prompt
            );


        return send(

            res,

            result.success
                ? 200
                : 502,

            result

        );

    }

    catch (error) {

        console.error(
            "KAGE SEARCH CONTEXT API ERROR:",
            error
        );


        return send(

            res,

            500,

            {

                success: false,

                error:
                    error?.message ||
                    "search context api failed"

            }

        );

    }

}
