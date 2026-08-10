import {
  getLocalAIStatus,
  runLocalAI
} from "../local-ai/engine.js";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const status = await getLocalAIStatus();

      return Response.json({
        success: true,
        name: "kage-local-ai",
        status: "ready",
        local: true,
        ...status
      });
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();

        const text =
          typeof body?.text === "string"
            ? body.text
            : "";

        if (!text.trim()) {
          return Response.json(
            {
              success: false,
              error: "text is required"
            },
            {
              status: 400
            }
          );
        }

        const result = await runLocalAI(text);

        return Response.json({
          success: true,
          local: true,
          result
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            local: true,
            error:
              error instanceof Error
                ? error.message
                : String(error)
          },
          {
            status: 500
          }
        );
      }
    }

    return Response.json(
      {
        success: false,
        error: "method not allowed"
      },
      {
        status: 405
      }
    );
  }
};
