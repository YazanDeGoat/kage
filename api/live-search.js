import {
    runLiveSearch,
    createSearchMessage
} from "../backend/liveSearch.js";


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


function getPrompt(req) {

    if (
        req.method === "GET"
    ) {

        return String(
            req.query?.q ||
            req.query?.prompt ||
            ""
        ).trim();

    }


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


    return String(
        body?.prompt ||
        body?.query ||
        ""
    ).trim();

}


export default async function handler(
    req,
    res
) {

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


    try {

        const prompt =
            getPrompt(req);


        if (!prompt) {

            return send(

                res,

                400,

                {

                    success: false,

                    error:
                        "missing prompt"

                }

            );

        }


        const searchResult =
            await runLiveSearch(
                prompt
            );


        const searchMessage =
            createSearchMessage(
                searchResult
            );


        return send(

            res,

            200,

            {

                success:
                    searchResult.success,

                prompt:
                    searchResult.prompt,

                context:
                    searchResult.context,

                searchMessage,

                results:
                    searchResult.results,

                error:
                    searchResult.error

            }

        );

    }

    catch (error) {

        console.error(
            "KAGE LIVE SEARCH API ERROR:",
            error
        );


        return send(

            res,

            500,

            {

                success: false,

                error:
                    error?.message ||
                    "live search api failed"

            }

        );

    }

}
