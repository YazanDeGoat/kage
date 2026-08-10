import { detectCapabilities } from "./capabilities.js";

function normalizeContext(context) {
  if (!context || typeof context !== "object") {
    return {};
  }

  return context;
}

export function createOrchestrationPlan({
  message = "",
  capability = null,
  context = {}
} = {}) {
  const normalizedMessage = String(message ?? "").trim();

  const detected = detectCapabilities({
    message: normalizedMessage,
    context: normalizeContext(context)
  });

  const selectedCapability =
    capability ||
    detected.primary ||
    detected.capabilities?.[0] ||
    "chat";

  return {
    capability: selectedCapability,

    capabilities: detected.capabilities || [selectedCapability],

    message: normalizedMessage,

    context: normalizeContext(context),

    decision: {
      owner: "kage",
      action: "dispatch",
      providerRole: "underlying-capability"
    }
  };
}
