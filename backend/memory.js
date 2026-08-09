const MEMORY_KEY = "kage-memory";

function getMemoryStore() {
    return {};
}

export function getMemory() {
    return getMemoryStore();
}

export function saveMemory(key, value) {
    return {
        success: true,
        key,
        value
    };
}

export function deleteMemory(key) {
    return {
        success: true,
        key
    };
}

export function clearMemory() {
    return {
        success: true
    };
}
