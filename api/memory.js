import {
    saveMemory,
    getMemories,
    searchMemories,
    deleteMemory,
    clearMemory
} from "../backend/memoryStore.js";


function json(data, status = 200) {

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


export default async function handler(req) {

    if (req.method === "GET") {

        const url =
            new URL(req.url);

        const chatId =
            url.searchParams.get(
                "chatId"
            ) || "global";

        const query =
            url.searchParams.get(
                "q"
            ) || "";

        const memories =
            query
                ? await searchMemories(
                    chatId,
                    query
                )
                : await getMemories(
                    chatId
                );

        return json({
            success: true,
            memories
        });

    }


    if (req.method !== "POST") {

        return json(
            {
                success: false,
                error: "method not allowed"
            },
            405
        );

    }


    let body;

    try {

        body =
            await req.json();

    } catch {

        return json(
            {
                success: false,
                error: "invalid json"
            },
            400
        );

    }


    const action =
        body.action || "save";

    const chatId =
        body.chatId || "global";


    if (action === "save") {

        return json(
            await saveMemory(
                chatId,
                body.text
            )
        );

    }


    if (action === "delete") {

        return json(
            await deleteMemory(
                chatId,
                body.memoryId
            )
        );

    }


    if (action === "clear") {

        return json(
            await clearMemory(
                chatId
            )
        );

    }


    return json(
        {
            success: false,
            error: "unknown memory action"
        },
        400
    );

}
