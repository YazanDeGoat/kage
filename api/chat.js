export default async function handler(
    req,
    res
) {

    if (
        req.method !== "POST"
    ) {

        return res.status(405).json({

            success: false,

            text:
                "method not allowed"

        });

    }


    try {

        const body =
            typeof req.body === "string"
                ? JSON.parse(req.body)
                : req.body;


        const prompt =
            body?.prompt;


        if (
            !prompt ||
            !String(prompt).trim()
        ) {

            return res.status(400).json({

                success: false,

                text:
                    "missing message"

            });

        }


        const apiKey =
            process.env.OPENROUTER_API_KEY;


        const model =
            process.env.OPENROUTER_MODEL ||
            "openrouter/auto";


        if (!apiKey) {

            return res.status(500).json({

                success: false,

                text:
                    "missing OPENROUTER_API_KEY in Vercel"

            });

        }


        const response =
            await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`,

                        "HTTP-Referer":
                            "https://kage.vercel.app",

                        "X-Title":
                            "KAGE"

                    },

                    body:
                        JSON.stringify({

                            model,

                            messages: [

                                {

                                    role:
                                        "system",

                                    content:
                                        "you are kage. reply naturally, clearly, and helpfully. use lowercase when natural."

                                },

                                {

                                    role:
                                        "user",

                                    content:
                                        String(prompt)

                                }

                            ]

                        })

                }
            );


        const raw =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(raw);

        } catch {

            data = null;

        }


        if (
            !response.ok
        ) {

            return res.status(
                response.status
            ).json({

                success: false,

                text:
                    data?.error?.message ||
                    raw ||
                    "openrouter request failed"

            });

        }


        const text =
            data?.choices?.[0]?.message?.content;


        if (!text) {

            return res.status(500).json({

                success: false,

                text:
                    "openrouter returned no message"

            });

        }


        return res.status(200).json({

            success: true,

            text

        });


    } catch (error) {

        console.log(
            "KAGE BACKEND ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            text:
                "kage backend error: " +
                error.message

        });

    }

}
