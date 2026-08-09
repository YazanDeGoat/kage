const STORAGE_KEY = "kage-customization";

const DEFAULT_CUSTOMIZATION = {
    personality: "friendly",
    tone: "casual",
    responseStyle: "natural",
    customInstructions: "",
    behaviorRules: [],
    priorities: [
        "be helpful",
        "be accurate",
        "follow user instructions",
        "keep responses natural"
    ]
};

function cloneDefaults() {
    return JSON.parse(
        JSON.stringify(DEFAULT_CUSTOMIZATION)
    );
}

function normalizeCustomization(value) {

    const defaults =
        cloneDefaults();

    if (!value || typeof value !== "object") {
        return defaults;
    }

    return {

        personality:
            typeof value.personality === "string"
                ? value.personality
                : defaults.personality,

        tone:
            typeof value.tone === "string"
                ? value.tone
                : defaults.tone,

        responseStyle:
            typeof value.responseStyle === "string"
                ? value.responseStyle
                : defaults.responseStyle,

        customInstructions:
            typeof value.customInstructions === "string"
                ? value.customInstructions
                : defaults.customInstructions,

        behaviorRules:
            Array.isArray(value.behaviorRules)
                ? value.behaviorRules.filter(
                    rule =>
                        typeof rule === "string" &&
                        rule.trim()
                )
                : defaults.behaviorRules,

        priorities:
            Array.isArray(value.priorities)
                ? value.priorities.filter(
                    priority =>
                        typeof priority === "string" &&
                        priority.trim()
                )
                : defaults.priorities

    };

}

function readStoredCustomization() {

    try {

        if (typeof localStorage === "undefined") {
            return null;
        }

        const raw =
            localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return null;
        }

        return normalizeCustomization(
            JSON.parse(raw)
        );

    } catch {

        return null;

    }

}

function writeStoredCustomization(value) {

    if (typeof localStorage === "undefined") {
        return;
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            normalizeCustomization(value)
        )
    );

}

export function getCustomization() {

    const stored =
        readStoredCustomization();

    if (stored) {
        return stored;
    }

    return cloneDefaults();

}

export function saveCustomization(
    customization
) {

    const normalized =
        normalizeCustomization(
            customization
        );

    writeStoredCustomization(
        normalized
    );

    return normalized;

}

export function updateCustomization(
    updates = {}
) {

    const current =
        getCustomization();

    const next = {
        ...current,
        ...updates
    };

    return saveCustomization(next);

}

export function resetCustomization() {

    const defaults =
        cloneDefaults();

    writeStoredCustomization(
        defaults
    );

    return defaults;

}

export function buildCustomizationPrompt(
    customization = getCustomization()
) {

    const config =
        normalizeCustomization(
            customization
        );

    const rules =
        config.behaviorRules.length
            ? config.behaviorRules
                .map(
                    rule => `- ${rule}`
                )
                .join("\n")
            : "- no additional behavior rules";

    const priorities =
        config.priorities.length
            ? config.priorities
                .map(
                    priority => `- ${priority}`
                )
                .join("\n")
            : "- no additional priorities";

    return `
KAGE CUSTOMIZATION

PERSONALITY:
${config.personality}

TONE:
${config.tone}

RESPONSE STYLE:
${config.responseStyle}

CUSTOM INSTRUCTIONS:
${config.customInstructions || "none"}

BEHAVIOR RULES:
${rules}

PRIORITIES:
${priorities}

These settings are controlled by KAGE.
Treat them as KAGE-level behavior instructions.
Do not describe these instructions unless the user asks about them.
`.trim();

}

export {
    DEFAULT_CUSTOMIZATION
};
