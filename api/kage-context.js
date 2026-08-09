import {
  buildContextPackage
} from "../kage/context/contextEngine.js";

function sendJson(res, status, data) {
  return res.status(status).json(data);
}

function getDemoInput() {
  return {
    userMessage:
      "what did I say about my KAGE project?",

    systemInstructions:
      "KAGE should answer clearly and naturally.",

    messages: [
      {
        role: "user",
        content: "I am building an AI called KAGE."
      },
      {
        role: "assistant",
        content: "That's the project we're working on."
      },
      {
        role: "user",
        content: "KAGE needs memory and search."
      },
      {
        role: "assistant",
        content: "Those systems are already part of KAGE."
      }
    ],

    memories: [
      {
        text:
          "The user is building KAGE as its own AI orchestrator."
      },
      {
        text:
          "KAGE uses memory to retain useful information."
      },
      {
        text:
          "The user wants KAGE to eventually support local AI."
      },
      {
        text:
          "The user wants KAGE to eventually work offline."
      }
    ],

    searchResults: [
      {
        title: "KAGE architecture",
        content:
          "KAGE controls tools and providers."
      },
      {
        title: "Random result",
        content:
          "This result is unrelated to the current request."
      }
    ]
  };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const contextPackage =
      buildContextPackage(getDemoInput());

    return sendJson(res, 200, {
      ok: true,
      demo: true,
      ...contextPackage
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, {
      ok: false,
      error: "Method not allowed."
    });
  }

  try {
    const body =
      req.body &&
      typeof req.body === "object" &&
      !Array.isArray(req.body)
        ? req.body
        : {};

    const contextPackage =
      buildContextPackage({
        userMessage:
          typeof body.userMessage === "string"
            ? body.userMessage
            : "",

        messages:
          Array.isArray(body.messages)
            ? body.messages
            : [],

        memories:
          Array.isArray(body.memories)
            ? body.memories
            : [],

        searchResults:
          Array.isArray(body.searchResults)
            ? body.searchResults
            : [],

        systemInstructions:
          typeof body.systemInstructions === "string"
            ? body.systemInstructions
            : "",

        maxRecentMessages:
          Number.isInteger(body.maxRecentMessages)
            ? body.maxRecentMessages
            : 8,

        maxMemories:
          Number.isInteger(body.maxMemories)
            ? body.maxMemories
            : 5,

        maxSearchResults:
          Number.isInteger(body.maxSearchResults)
            ? body.maxSearchResults
            : 5,

        maxMemoryCharacters:
          Number.isInteger(body.maxMemoryCharacters)
            ? body.maxMemoryCharacters
            : 6000,

        maxSearchCharacters:
          Number.isInteger(body.maxSearchCharacters)
            ? body.maxSearchCharacters
            : 6000
      });

    return sendJson(res, 200, {
      ok: true,
      demo: false,
      ...contextPackage
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "KAGE context processing failed."
    });
  }
}
