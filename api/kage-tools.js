import {
  runTool,
  getAvailableTools
} from "../kage/tools/toolEngine.js";

function sendJson(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      tools: getAvailableTools()
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
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const { tool, input = {} } = body;

    if (!tool || typeof tool !== "string") {
      return sendJson(res, 400, {
        ok: false,
        error: "A tool name is required."
      });
    }

    const result = await runTool(tool, input);

    return sendJson(res, result.ok ? 200 : 400, result);
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "KAGE tool request failed."
    });
  }
}
