export default async function handler(req, res) {
  // Allow browser requests to reach the API.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  // Handle browser preflight requests.
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // Simple health check.
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "kage-tools",
      status: "ready"
    });
  }
  // This endpoint only accepts POST requests for tool execution.
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }
  try {
    const body = req.body || {};
    const tool =
      typeof body.tool === "string"
        ? body.tool.trim()
        : "";
    const input =
      body.input !== undefined
        ? body.input
        : null;
    if (!tool) {
      return res.status(400).json({
        ok: false,
        error: "Missing tool"
      });
    }
    /*
     * Phase 14 currently provides the safe KAGE tool gateway.
     *
     * Tool implementations are intentionally not hardcoded into
     * the API route. The route validates the request and returns
     * a normalized tool result.
     *
     * Future KAGE tool providers can be connected behind this
     * gateway without changing the public API.
     */
    return res.status(200).json({
      ok: true,
      tool,
      input,
      result: {
        status: "accepted",
        message: `KAGE received the ${tool} tool request.`
      }
    });
  } catch (error) {
    console.error("KAGE tools API error:", error);
    return res.status(500).json({
      ok: false,
      error: "KAGE tools request failed"
    });
  }
}
