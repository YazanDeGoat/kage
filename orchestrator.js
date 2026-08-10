import {
  CAPABILITIES,
  isCapability
} from "./capabilities.js";

function normalizeMessage(message) {
  if (typeof message !== "string") {
    return "";
  }

  return message.trim();
}

function detectCapabilities(message) {
  const text = normalizeMessage(message).toLowerCase();

  const capabilities = [];

  if (!text) {
    return [CAPABILITIES.CHAT];
  }

  if (
    /\b(search|look up|find|latest|today|current|news|weather)\b/.test(text)
  ) {
    capabilities.push(CAPABILITIES.SEARCH);
  }

  if (
    /\b(remember|forgot|memory|recall|save this)\b/.test(text)
  ) {
    capabilities.push(CAPABILITIES.MEMORY);
  }

  if (
    /\b(image|picture|photo|draw|generate an image)\b/.test(text)
  ) {
    capabilities.push(CAPABILITIES.IMAGE);
  }

  if (
    /\b(video|movie|clip|generate a video)\b/.test(text)
  ) {
    capabilities.push(CAPABILITIES.VIDEO);
  }

  if (
    /\b(voice|speak|say this|read this aloud)\b/.test(text)
  ) {
    capabilities.push(CAPABILITIES.VOICE);
  }

  if (
    /\b(offline|without internet|no internet)\b/.test(text)
  ) {
    capabilities.push(CAPABILITIES.OFFLINE);
  }

  if (
    /\b(local ai|local model|run locally|on my device)\b/.test(text)
  ) {
    capabilities.push(CAPABILITIES.LOCAL_AI);
  }

  if (
    /\b(tool|calculate|calculator|execute|do this)\b/.test(text)
  ) {
    capabilities.push(CAPABILITIES.TOOLS);
  }

  if (capabilities.length === 0) {
    capabilities.push(CAPABILITIES.CHAT);
  }

  return [...new Set(capabilities)];
}

function choosePrimaryCapability(capabilities) {
  const priority = [
    CAPABILITIES.OFFLINE,
    CAPABILITIES.LOCAL_AI,
    CAPABILITIES.SEARCH,
    CAPABILITIES.MEMORY,
    CAPABILITIES.TOOLS,
    CAPABILITIES.IMAGE,
    CAPABILITIES.VIDEO,
    CAPABILITIES.VOICE,
    CAPABILITIES.CHAT
  ];

  for (const capability of priority) {
    if (capabilities.includes(capability)) {
      return capability;
    }
  }

  return CAPABILITIES.CHAT;
}

function createPlan(message) {
  const normalizedMessage = normalizeMessage(message);

  const capabilities = detectCapabilities(normalizedMessage);

  const primaryCapability =
    choosePrimaryCapability(capabilities);

  return {
    system: "kage",
    version: "19.0.0",
    message: normalizedMessage,
    capabilities,
    primaryCapability,
    providerRole: "component",
    orchestratorRole: "decision-maker"
  };
}

function createOrchestrationResponse(message) {
  const plan = createPlan(message);

  return {
    success: true,
    plan
  };
}

function validatePlan(plan) {
  if (!plan || typeof plan !== "object") {
    return false;
  }

  if (plan.system !== "kage") {
    return false;
  }

  if (!Array.isArray(plan.capabilities)) {
    return false;
  }

  if (!isCapability(plan.primaryCapability)) {
    return false;
  }

  return plan.capabilities.every(isCapability);
}

export {
  normalizeMessage,
  detectCapabilities,
  choosePrimaryCapability,
  createPlan,
  createOrchestrationResponse,
  validatePlan
};
