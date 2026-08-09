const OPENROUTER_URL = "https://openrouter.ai/api/v1/images";

const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";

function getApiKey() {
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  return key;
}

function cleanPrompt(prompt) {
  if (typeof prompt !== "string") {
    throw new Error("Image prompt must be text");
  }

  const cleaned = prompt.trim();

  if (!cleaned) {
    throw new Error("Image prompt cannot be empty");
  }

  if (cleaned.length > 4000) {
    throw new Error("Image prompt is too long");
  }

  return cleaned;
}

function cleanOptions(options = {}) {
  const allowedResolutions = [
    "512",
    "1K",
    "2K",
    "4K"
  ];

  const allowedRatios = [
    "1:1",
    "16:9",
    "9:16",
    "4:3",
    "3:4",
    "3:2",
    "2:3",
    "21:9"
  ];

  const allowedFormats = [
    "png",
    "jpeg",
    "webp"
  ];

  const result = {};

  if (
    typeof options.model === "string" &&
    options.model.trim()
  ) {
    result.model = options.model.trim();
  }

  if (allowedResolutions.includes(options.resolution)) {
    result.resolution = options.resolution;
  }

  if (allowedRatios.includes(options.aspect_ratio)) {
    result.aspect_ratio = options.aspect_ratio;
  }

  if (
    typeof options.quality === "string" &&
    ["auto", "low", "medium", "high"].includes(options.quality)
  ) {
    result.quality = options.quality;
  }

  if (allowedFormats.includes(options.output_format)) {
    result.output_format = options.output_format;
  }

  if (
    Number.isInteger(options.n) &&
    options.n >= 1 &&
    options.n <= 4
  ) {
    result.n = options.n;
  }

  return result;
}

function normalizeImages(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const base64 =
        item.b64_json ||
        item.b64Json ||
        null;

      const mediaType =
        item.media_type ||
        item.mediaType ||
        "image/png";

      if (!base64) {
        return null;
      }

      return {
        mediaType,
        dataUrl: `data:${mediaType};base64,${base64}`
      };
    })
    .filter(Boolean);
}

export async function generateImage(prompt, options = {}) {
  const cleanedPrompt = cleanPrompt(prompt);
  const cleanedOptions = cleanOptions(options);

  const requestBody = {
    model:
      cleanedOptions.model ||
      DEFAULT_IMAGE_MODEL,

    prompt: cleanedPrompt
  };

  if (cleanedOptions.resolution) {
    requestBody.resolution =
      cleanedOptions.resolution;
  }

  if (cleanedOptions.aspect_ratio) {
    requestBody.aspect_ratio =
      cleanedOptions.aspect_ratio;
  }

  if (cleanedOptions.quality) {
    requestBody.quality =
      cleanedOptions.quality;
  }

  if (cleanedOptions.output_format) {
    requestBody.output_format =
      cleanedOptions.output_format;
  }

  if (cleanedOptions.n) {
    requestBody.n = cleanedOptions.n;
  }

  const response = await fetch(
    OPENROUTER_URL,
    {
      method: "POST",

      headers: {
        "Authorization":
          `Bearer ${getApiKey()}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(requestBody)
    }
  );

  const rawText = await response.text();

  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Image provider returned invalid JSON: ${rawText.slice(0, 300)}`
    );
  }

  if (!response.ok) {
    const providerMessage =
      data?.error?.message ||
      data?.message ||
      `HTTP ${response.status}`;

    throw new Error(
      `Image generation failed: ${providerMessage}`
    );
  }

  const images = normalizeImages(data.data);

  if (!images.length) {
    throw new Error(
      "Image provider returned no generated images"
    );
  }

  return {
    success: true,

    model:
      data.model ||
      requestBody.model,

    images,

    usage:
      data.usage ||
      null
  };
}
