import {
  createOrchestrationResponse,
  validatePlan
} from "../kage/orchestrator.js";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json(
      {
        success: false,
        error: "method_not_allowed"
      },
      405
    );
  }

  try {
    const body = await request.json();

    if (!body || typeof body.message !== "string") {
      return json(
        {
          success: false,
          error: "message_required"
        },
        400
      );
    }

    const result = createOrchestrationResponse(body.message);

    if (!validatePlan(result.plan)) {
      return json(
        {
          success: false,
          error: "invalid_kage_plan"
        },
        500
      );
    }

    return json(result);
  } catch (error) {
    console.error("[KAGE] orchestration error:", error);

    return json(
      {
        success: false,
        error: "orchestration_failed"
      },
      500
    );
  }
}
