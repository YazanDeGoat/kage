const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_VIDEO_MODEL =
  "google/veo-3.1-generate-preview";

function getApiKey() {
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  return key;
}

function cleanPrompt(prompt) {
  if (typeof prompt !== "string") {
    throw new Error("Video prompt must be text");
  }

  const cleaned = prompt.trim();

  if (!cleaned) {
    throw new Error("Video prompt cannot be empty");
  }

  if (cleaned.length > 4000) {
    throw new Error("Video prompt is too long");
  }

  return cleaned;
}

function cleanOptions(options = {}) {
  const result = {};

  if (
    typeof options.model === "string" &&
    options.model.trim()
  ) {
    result.model = options.model.trim();
  }

  if (
    typeof options.aspect_ratio === "string" &&
    ["16:9", "9:16"].includes(
      options.aspect_ratio
    )
  ) {
    result.aspect_ratio =
      options.aspect_ratio;
  }

  if (
    typeof options.duration === "number" &&
    Number.isFinite(options.duration) &&
    options.duration >= 1 &&
    options.duration <= 30
  ) {
    result.duration =
      Math.floor(options.duration);
  }

  return result;
}

function extractProviderError(data) {
  return (
    data?.error?.message ||
    data?.error ||
    data?.message ||
    null
  );
}

function extractVideoResult(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  if (
    typeof data.video_url === "string" &&
    data.video_url
  ) {
    return {
      url: data.video_url,
      type: "video/mp4"
    };
  }

  if (
    typeof data.url === "string" &&
    data.url
  ) {
    return {
      url: data.url,
      type: "video/mp4"
    };
  }

  const video =
    data?.choices?.[0]?.message?.videos?.[0] ||
    data?.choices?.[0]?.message?.video ||
    null;

  if (
    video &&
    typeof video.url === "string"
  ) {
    return {
      url: video.url,
      type:
        video.mime_type ||
        video.mimeType ||
        "video/mp4"
    };
  }

  return null;
}

export async function generateVideo(
  prompt,
  options = {}
) {
  const cleanedPrompt =
    cleanPrompt(prompt);

  const cleanedOptions =
    cleanOptions(options);

  const model =
    cleanedOptions.model ||
    DEFAULT_VIDEO_MODEL;

  const content = [
    {
      type: "text",
      text: cleanedPrompt
    }
  ];

  const requestBody = {
    model,
    messages: [
      {
        role: "user",
        content
      }
    ]
  };

  if (cleanedOptions.aspect_ratio) {
    requestBody.aspect_ratio =
      cleanedOptions.aspect_ratio;
  }

  if (cleanedOptions.duration) {
    requestBody.duration =
      cleanedOptions.duration;
  }

  const response = await fetch(
    OPENROUTER_URL,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${getApiKey()}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(requestBody)
    }
  );

  const rawText =
    await response.text();

  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Video provider returned invalid JSON: ${rawText.slice(
        0,
        300
      )}`
    );
  }

  if (!response.ok) {
    const providerError =
      extractProviderError(data) ||
      `HTTP ${response.status}`;

    throw new Error(
      `Video generation failed: ${providerError}`
    );
  }

  const video =
    extractVideoResult(data);

  if (!video) {
    throw new Error(
      "Video provider did not return a video URL"
    );
  }

  return {
    success: true,

    model,

    video,

    providerResponse: data
  };
}
