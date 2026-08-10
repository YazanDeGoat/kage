const CAPABILITIES = Object.freeze({
  CHAT: "chat",
  MEMORY: "memory",
  SEARCH: "search",
  TOOLS: "tools",
  IMAGE: "image",
  VIDEO: "video",
  VOICE: "voice",
  OFFLINE: "offline",
  LOCAL_AI: "local_ai",
  CLOUD_AI: "cloud_ai"
});

const CAPABILITY_DESCRIPTIONS = Object.freeze({
  [CAPABILITIES.CHAT]: "Normal conversational responses.",
  [CAPABILITIES.MEMORY]: "Read or update KAGE memory.",
  [CAPABILITIES.SEARCH]: "Retrieve current or external information.",
  [CAPABILITIES.TOOLS]: "Execute an available KAGE tool.",
  [CAPABILITIES.IMAGE]: "Generate or process images.",
  [CAPABILITIES.VIDEO]: "Generate or process video.",
  [CAPABILITIES.VOICE]: "Speech or voice interaction.",
  [CAPABILITIES.OFFLINE]: "Use capabilities without a network connection.",
  [CAPABILITIES.LOCAL_AI]: "Use a model running locally on the user's device.",
  [CAPABILITIES.CLOUD_AI]: "Use a remote/cloud AI provider."
});

function isCapability(value) {
  return Object.values(CAPABILITIES).includes(value);
}

function getCapabilityDescription(value) {
  return CAPABILITY_DESCRIPTIONS[value] || null;
}

function listCapabilities() {
  return Object.values(CAPABILITIES);
}

export {
  CAPABILITIES,
  CAPABILITY_DESCRIPTIONS,
  isCapability,
  getCapabilityDescription,
  listCapabilities
};
