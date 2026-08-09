export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            text: "method not allowed"
        });
        return;
    }

    try {
        const body = req.body || {};

        const prompt =
            typeof body.prompt === "string"
                ? body.prompt.trim()
                : "";

        if (!prompt) {
            res.status(400).json({
                success: false,
                text: "missing message"
            });
            return;
        }

        const apiKey =
            process.env.OPENROUTER_API_KEY;

        const model =
            process.env.OPENROUTER_MODEL ||
            "openai/gpt-4o-mini";

        if (!apiKey) {
            res.status(500).json({
                success: false,
                text: "missing OPENROUTER_API_KEY"
            });
            return;
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": "https://kage.app",
                    "X-Title": "KAGE"
                },

                body: JSON.stringify({
                    model,

                    messages: [
                        {
                            role: "system",
                            content:
                                "you are kage. reply naturally, clearly, and helpfully."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],

                    stream: true
                })
            }
        );

        if (!response.ok) {
            const errorText =
                await response.text();

            res.status(response.status).json({
                success: false,
                text:
                    "openrouter error: " +
                    errorText
            });

            return;
        }

        if (!response.body) {
            res.status(500).json({
                success: false,
                text: "stream unavailable"
            });

            return;
        }

        res.writeHead(200, {
            "Content-Type":
                "text/event-stream",

            "Cache-Control":
                "no-cache, no-transform",

            "Connection":
                "keep-alive",

            "X-Accel-Buffering":
                "no"
        });

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        try {
            while (true) {
                const {
                    value,
                    done
                } = await reader.read();

                if (done) {
                    break;
                }

                const chunk =
                    decoder.decode(
                        value,
                        {
                            stream: true
                        }
                    );

                res.write(chunk);
            }
        }

        finally {
            reader.releaseLock();
        }

        res.end();

    }

    catch (error) {

        console.error(
            "KAGE STREAM ERROR:",
            error
        );

        if (!res.headersSent) {

            res.status(500).json({
                success: false,
                text:
                    "kage streaming error: " +
                    error.message
            });

            return;
        }

        res.end();
    }
}
