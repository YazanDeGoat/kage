const capabilities = Object.freeze({
  chat: Object.freeze({
    id: "chat",
    name: "Chat",
    available: true,
  }),

  memory: Object.freeze({
    id: "memory",
    name: "Memory",
    available: true,
  }),

  search: Object.freeze({
    id: "search",
    name: "Search",
    available: true,
  }),

  tools: Object.freeze({
    id: "tools",
    name: "Tools",
    available: true,
  }),

  image: Object.freeze({
    id: "image",
    name: "Image",
    available: true,
  }),

  video: Object.freeze({
    id: "video",
    name: "Video",
    available: true,
  }),

  voice: Object.freeze({
    id: "voice",
    name: "Voice",
    available: true,
  }),

  offline: Object.freeze({
    id: "offline",
    name: "Offline",
    available: true,
  }),

  localAI: Object.freeze({
    id: "local-ai",
    name: "Local AI",
    available: true,
  }),

  cloudAI: Object.freeze({
    id: "cloud-ai",
    name: "Cloud AI",
    available: true,
  }),
});

export function getKageCapabilities() {
  return capabilities;
}

export function hasKageCapability(capabilityId) {
  return Object.values(capabilities).some(
    (capability) =>
      capability.id === capabilityId && capability.available === true
  );
}

export function getAvailableKageCapabilities() {
  return Object.values(capabilities).filter(
    (capability) => capability.available === true
  );
}
