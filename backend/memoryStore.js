const memoryStore = new Map();

function normalizeChatId(chatId) {
    return String(chatId || "global");
}

function normalizeText(text) {
    return String(text || "").trim();
}

export async function saveMemory(
    chatId = "global",
    text = ""
) {
    const id =
        normalizeChatId(chatId);

    const value =
        normalizeText(text);

    if (!value) {
        return {
            success: false,
            error: "memory is empty"
        };
    }

    const memories =
        memoryStore.get(id) || [];

    const memory = {
        id: crypto.randomUUID(),
        text: value,
        created: Date.now()
    };

    memories.push(memory);

    memoryStore.set(
        id,
        memories.slice(-100)
    );

    return {
        success: true,
        memory
    };
}

export async function getMemories(
    chatId = "global"
) {
    const id =
        normalizeChatId(chatId);

    return (
        memoryStore.get(id) || []
    );
}

export async function searchMemories(
    chatId = "global",
    query = ""
) {
    const memories =
        await getMemories(chatId);

    const search =
        normalizeText(query).toLowerCase();

    if (!search) {
        return memories.slice(-10);
    }

    const words =
        search
            .split(/\s+/)
            .filter(Boolean);

    const matches =
        memories.filter(memory => {

            const memoryText =
                memory.text.toLowerCase();

            return words.some(word =>
                memoryText.includes(word)
            );

        });

    return matches.slice(-10);
}

export async function deleteMemory(
    chatId = "global",
    memoryId
) {
    const id =
        normalizeChatId(chatId);

    const memories =
        await getMemories(id);

    const updated =
        memories.filter(
            memory =>
                memory.id !== memoryId
        );

    memoryStore.set(
        id,
        updated
    );

    return {
        success: true
    };
}

export async function clearMemory(
    chatId = "global"
) {
    const id =
        normalizeChatId(chatId);

    memoryStore.delete(id);

    return {
        success: true
    };
}
