import { registerTool } from "./toolRegistry.js";

registerTool({
  name: "get_current_time",

  description:
    "Returns the current server time in ISO 8601 format.",

  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false
  },

  execute: async () => {
    return {
      success: true,
      time: new Date().toISOString()
    };
  }
});

registerTool({
  name: "echo",

  description:
    "Returns the text supplied to the tool.",

  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string"
      }
    },
    required: ["text"],
    additionalProperties: false
  },

  execute: async ({ text }) => {
    if (typeof text !== "string") {
      throw new Error("text must be a string.");
    }

    return {
      success: true,
      text
    };
  }
});

export {};
