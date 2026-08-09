const tools = new Map();

function registerTool(tool) {
  if (!tool || typeof tool !== "object") {
    throw new Error("Invalid tool.");
  }

  if (!tool.name || typeof tool.name !== "string") {
    throw new Error("Tool name is required.");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(tool.name)) {
    throw new Error("Invalid tool name.");
  }

  if (typeof tool.execute !== "function") {
    throw new Error(`Tool "${tool.name}" must have an execute function.`);
  }

  tools.set(tool.name, {
    name: tool.name,
    description: tool.description || "",
    inputSchema: tool.inputSchema || {},
    execute: tool.execute
  });

  return tools.get(tool.name);
}

function unregisterTool(name) {
  return tools.delete(name);
}

function hasTool(name) {
  return tools.has(name);
}

function getTool(name) {
  return tools.get(name) || null;
}

function listTools() {
  return Array.from(tools.values()).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));
}

async function executeTool(name, input = {}) {
  const tool = getTool(name);

  if (!tool) {
    throw new Error(`Unknown KAGE tool: ${name}`);
  }

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Tool input must be an object.");
  }

  return await tool.execute(input);
}

export {
  registerTool,
  unregisterTool,
  hasTool,
  getTool,
  listTools,
  executeTool
};
