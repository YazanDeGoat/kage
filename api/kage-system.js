import { dispatchKageRequest } from "../kage/dispatcher.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const message =
      typeof body.message === "string"
        ? body.message
        : "";

    const capability =
      typeof body.capability === "string"
        ? body.capability
        : null;

    const context =
      body.context &&
      typeof body.context === "object"
        ? body.context
        : {};

    const result = dispatchKageRequest({
      message,
      capability,
      context
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("KAGE orchestration error:", error);

    return res.status(500).json({
      ok: false,
      error: "KAGE orchestration failed"
    });
  }
}
