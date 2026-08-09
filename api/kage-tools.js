import {
  runTool,
  getAvailableTools
} from "../kage/tools/toolEngine.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        tools: getAvailableTools()
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed."
      });
    }

    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      body = {};
    }

    const tool = body.tool;
    const input =
      body.input &&
      typeof body.input === "object" &&
      !Array.isArray(body.input)
        ? body.input
        : {};

    if (typeof tool !== "string" || tool.trim() === "") {
      return res.status(400).json({
        ok: false,
        error: "A valid tool name is required."
      });
    }

    const result = await runTool(tool.trim(), input);

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("KAGE tools error:", error);

    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "KAGE tool request failed."
    });
  }
}
