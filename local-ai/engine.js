import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4/+esm";
import KAGE_LOCAL_AI_CONFIG from "./config.js";

env.useBrowserCache = KAGE_LOCAL_AI_CONFIG.cache.enabled;
env.allowRemoteModels = true;
env.allowLocalModels = true;

let pipelinePromise = null;

function hasWebGPU() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

function selectDevice() {
  if (
    KAGE_LOCAL_AI_CONFIG.devices.preferred === "webgpu" &&
    hasWebGPU()
  ) {
    return "webgpu";
  }

  return KAGE_LOCAL_AI_CONFIG.devices.fallback;
}

async function getPipeline() {
  if (!pipelinePromise) {
    const device = selectDevice();

    pipelinePromise = pipeline(
      KAGE_LOCAL_AI_CONFIG.model.task,
      KAGE_LOCAL_AI_CONFIG.model.id,
      {
        device,
        dtype: KAGE_LOCAL_AI_CONFIG.model.dtype
      }
    );
  }

  return pipelinePromise;
}

export async function getLocalAIStatus() {
  const webGPU = hasWebGPU();

  return {
    enabled: KAGE_LOCAL_AI_CONFIG.enabled,
    engine: KAGE_LOCAL_AI_CONFIG.engine,
    model: KAGE_LOCAL_AI_CONFIG.model.id,
    task: KAGE_LOCAL_AI_CONFIG.model.task,
    webgpu: webGPU,
    selectedDevice: webGPU ? "webgpu" : "wasm",
    browserCache: KAGE_LOCAL_AI_CONFIG.cache.enabled
  };
}

export async function runLocalAI(text) {
  if (!KAGE_LOCAL_AI_CONFIG.enabled) {
    throw new Error("KAGE local AI is disabled.");
  }

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Local AI requires text.");
  }

  const classifier = await getPipeline();

  const result = await classifier(text.trim());

  return {
    engine: "transformers-js",
    model: KAGE_LOCAL_AI_CONFIG.model.id,
    device: selectDevice(),
    result
  };
}
