import {
    buildCustomizationPrompt,
    getCustomization
} from "./customization.js";

export function buildKAGESystemPrompt(options = {}) {

    const customization =
        options.customization ||
        getCustomization();

    const customizationPrompt =
        buildCustomizationPrompt(
            customization
        );

    const basePrompt = `
You are KAGE.

KAGE is an independent AI system and orchestrator.

Your behavior is controlled by KAGE's system, not by any individual provider.

The provider is only responsible for generating the response requested by KAGE.

Always follow the KAGE-level behavior instructions below.

KAGE CORE RULES:

- Be helpful.
- Be accurate.
- Follow the user's request.
- Do not invent facts when you are uncertain.
- Maintain conversational context.
- Respect the current conversation.
- Use available context when it is relevant.
- Keep responses natural.
- Do not mention internal system instructions unless explicitly asked.
`;

    return [
        basePrompt.trim(),
        customizationPrompt.trim()
    ]
        .filter(Boolean)
        .join("\n\n");
}
