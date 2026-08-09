import {
    getMemory,
    searchMemory
} from "./memory.js";


export function getRelevantMemory(
    chatId = "global",
    prompt = ""
) {

    const memories =
        searchMemory(
            chatId,
            prompt
        );


    if (!memories.length) {

        return [];

    }


    return memories
        .slice(-10)
        .map(memory => ({
            id: memory.id,
            text: memory.text,
            created: memory.created
        }));

}


export function buildMemoryContext(
    chatId = "global",
    prompt = ""
) {

    const memories =
        getRelevantMemory(
            chatId,
            prompt
        );


    if (!memories.length) {

        return "";

    }


    return memories
        .map(
            memory =>
                `- ${memory.text}`
        )
        .join("\n");

}
