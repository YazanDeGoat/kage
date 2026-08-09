import { generateImage } from "../backend/imageGenerator.js";

export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).json({
      success: true
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "method not allowed"
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          success: false,
          error: "invalid JSON body"
        });
      }
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        success: false,
        error: "request body is required"
      });
    }

    const prompt = body.prompt;

    const options = {
      model: body.model,
      resolution: body.resolution,
      aspect_ratio: body.aspect_ratio,
      quality: body.quality,
      output_format: body.output_format,
      n: body.n
    };

    const result = await generateImage(
      prompt,
      options
    );

    return res.status(200).json(result);

  } catch (error) {
    console.error(
      "KAGE image error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "image generation failed"
    });
  }
}
