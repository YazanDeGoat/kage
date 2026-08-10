import { createOrchestrationPlan } from "./orchestrator.js";

const CAPABILITY_ROUTES = {
  chat: {
    type: "chat",
    status: "available"
  },

  memory: {
    type: "memory",
    status: "available"
  },

  search: {
    type: "search",
    status: "available"
  },

  image: {
    type: "image",
    status: "available"
  },

  video: {
    type: "video",
    status: "available"
  },

  voice: {
    type: "voice",
    status: "available"
  },

  tools: {
    type: "tools",
    status: "available"
  },

  offline: {
    type: "offline",
    status: "available"
  },

  local_ai: {
    type: "local_ai",
    status: "available"
  }
};

function normalizeCapability(capability) {
  if (!capability) {
    return "chat";
  }

  const normalized = String(capability)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return normalized;
}

function getRoute(capability) {
  const normalized = normalizeCapability(capability);

  return (
    CAPABILITY_ROUTES[normalized] || {
      type: "chat",
      status: "available"
    }
  );
}

export function dispatchKageRequest({
  message = "",
  capability = "chat",
  context = {}
} = {}) {
  const plan = createOrchestrationPlan({
    message,
    capability,
    context
  });

  const route = getRoute(plan.capability);

  return {
    ok: true,

    source: "kage",

    request: {
      message,
      capability: normalizeCapability(plan.capability)
    },

    route,

    plan,

    dispatch: {
      capability: route.type,
      status: route.status,
      delegatedBy: "kage"
    }
  };
}
