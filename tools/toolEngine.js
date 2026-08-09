import "./basicTools.js";

import {
  listTools,
  executeTool
} from "./toolRegistry.js";

async function runTool(name, input = {}) {
  const startedAt = Date.now();

  try {
    const result = await executeTool(name, input);

    return {
      ok: true,
      tool: name,
      result,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      ok: false,
      tool: name,
      error:
        error instanceof Error
          ? error.message
          : "Tool execution failed.",
      durationMs: Date.now() - startedAt
    };
  }
}

function getAvailableTools() {
  return listTools();
}

export {
  runTool,
  getAvailableTools
};
