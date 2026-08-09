const memoryStore = new Map();

export function getMemory(chatId = "global") {
    return memoryStore.get(chatId) || [];
}

export function saveMemory(chatId = "global", memory) {
    if (!memory) {
        return {
            success: false,
            error: "memory is empty"
        };
    }

    const memories = memoryStore.get(chatId) || [];

    memories.push({
        id: crypto.randomUUID(),
        text: String(memory),
        created: Date.now()
    });

    memoryStore.set(chatId, memories);

    return {
        success: true,
        memory: memories[memories.length - 1]
    };
}

export function deleteMemory(chatId = "global", memoryId) {
    const memories = memoryStore.get(chatId) || [];

    const updated = memories.filter(
        memory => memory.id !== memoryId
    );

    memoryStore.set(chatId, updated);

    return {
        success: true
    };
}

export function clearMemory(chatId = "global") {
    memoryStore.delete(chatId);

    return {
        success: true
    };
}

export function searchMemory(chatId = "global", query = "") {
    const memories = memoryStore.get(chatId) || [];

    const search = query.toLowerCase().trim();

    if (!search) {
        return memories;
    }

    return memories.filter(memory =>
        memory.text.toLowerCase().includes(search)
    );
}
