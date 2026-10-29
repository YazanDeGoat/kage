const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const IMAGE_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";
const VOICE_MODEL = "@cf/deepgram/aura-1";

const SYSTEM_PROMPT = `
You are Kage, a capable, direct, friendly AI assistant.

Your priorities:
- Answer the user's actual question clearly and accurately.
- Help with learning, reasoning, writing, coding, planning, and creative work.
- Explain uncertainty honestly. Never invent sources or claim to have done work you did not do.
- When the user shares code, inspect it carefully and provide usable corrections.
- When the user shares image content, describe only what you can reasonably infer.
- When web search results are provided, distinguish information from search results
  from your own background knowledge.
- Never claim you can access files, devices, accounts, or websites that you cannot access.
- If a task requires a tool that is unavailable, explain the limitation and offer a
  practical alternative.
- Keep ordinary answers concise unless the user needs a detailed explanation.
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value, maxLength = 30000) {
  return String(value ?? "").slice(0, maxLength);
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, number) =>
      String.fromCharCode(Number(number))
    );
}

function extractSearchResults(html) {
  const results = [];
  const pattern =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = pattern.exec(html)) && results.length < 8) {
    let url = decodeHtml(match[1]);
    let title = decodeHtml(match[2].replace(/<[^>]+>/g, "")).trim();

    if (url.startsWith("//")) {
      url = `https:${url}`;
    }

    try {
      const parsed = new URL(url);

      if (parsed.hostname.includes("duckduckgo.com") &&
          parsed.searchParams.has("uddg")) {
        url = parsed.searchParams.get("uddg");
      }

      const finalUrl = new URL(url);

      if (
        !["http:", "https:"].includes(finalUrl.protocol) ||
        !title
      ) {
        continue;
      }

      results.push({
        title,
        url: finalUrl.href
      });
    } catch {
      // Ignore malformed search results.
    }
  }

  return results;
}

async function handleSearch(request) {
  const body = await request.json();
  const query = cleanText(body.query, 400).trim();

  if (!query) {
    return json({ error: "Enter a search query." }, 400);
  }

  try {
    const url =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(query);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KageAI/1.0)",
        "Accept": "text/html"
      }
    });

    if (!response.ok) {
      return json({
        query,
        results: [],
        message: "The search provider did not return results."
      });
    }

    const html = await response.text();
    const results = extractSearchResults(html);

    return json({
      query,
      results,
      message: results.length
        ? "Search completed."
        : "No results were extracted. The search provider may have changed its page."
    });
  } catch {
    return json({
      query,
      results: [],
      message: "Search failed. Check your internet connection and try again."
    });
  }
}

async function handleChat(request, env) {
  const body = await request.json();

  const incoming = Array.isArray(body.messages)
    ? body.messages.slice(-20)
    : [];

  if (!incoming.length) {
    return json({ error: "Send a message first." }, 400);
  }

  const messages = incoming.map(message => ({
    role: ["user", "assistant"].includes(message.role)
      ? message.role
      : "user",
    content: cleanText(message.content, 24000)
  }));

  const lastUserMessage = [...messages]
    .reverse()
    .find(message => message.role === "user");

  if (!lastUserMessage?.content.trim() && !body.image) {
    return json({ error: "Your message is empty." }, 400);
  }

  const searchResults = Array.isArray(body.searchResults)
    ? body.searchResults.slice(0, 8)
    : [];

  if (searchResults.length) {
    const sourceText = searchResults.map((item, index) =>
      `${index + 1}. ${cleanText(item.title, 300)}\n` +
      `${cleanText(item.url, 1000)}`
    ).join("\n\n");

    lastUserMessage.content +=
      "\n\nWEB SEARCH RESULTS:\n" +
      sourceText +
      "\n\nUse these results when relevant. Do not claim you opened or verified " +
      "a page unless you actually did. Include the provided URLs in your answer.";
  }

  const history = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
  ];

  try {
    let result;

    if (body.image) {
      // Image understanding uses a vision model.
      const image = cleanText(body.image, 5_500_000);

      if (!image.startsWith("data:image/")) {
        return json({ error: "The image format was not recognized." }, 400);
      }

      const response = await env.AI.run(VISION_MODEL, {
        prompt:
          SYSTEM_PROMPT +
          "\n\nConversation:\n" +
          history
            .slice(-8)
            .map(m => `${m.role}: ${m.content}`)
            .join("\n\n") +
          "\n\nAnalyze the supplied image and answer the user's latest question.",
        image,
        max_tokens: 1800
      });

      result =
        response?.response ??
        response?.result?.response ??
        response?.description ??
        response?.output_text ??
        "";

      if (typeof result !== "string") {
        result = JSON.stringify(result);
      }
    } else {
      const response = await env.AI.run(TEXT_MODEL, {
        messages: history,
        max_tokens: 2048,
        temperature: 0.65
      });

      result =
        response?.response ??
        response?.result?.response ??
        response?.output_text ??
        "";

      if (typeof result !== "string") {
        result = JSON.stringify(result);
      }
    }

    if (!result.trim()) {
      return json({
        error: "The AI returned an empty response. Try again."
      }, 502);
    }

    return json({ reply: result });
  } catch (error) {
    return json({
      error:
        "Kage could not complete that request. The AI service may be unavailable, " +
        "the model may require activation, or your account may have reached a usage limit.",
      detail: cleanText(error?.message, 500)
    }, 502);
  }
}

async function handleImage(request, env) {
  const body = await request.json();
  const prompt = cleanText(body.prompt, 2000).trim();

  if (!prompt) {
    return json({ error: "Describe the image you want." }, 400);
  }

  try {
    const generated = await env.AI.run(IMAGE_MODEL, {
      prompt,
      width: 1024,
      height: 1024,
      num_steps: 4
    });

    const imageResponse = generated instanceof Response
      ? generated
      : new Response(generated, {
          headers: { "Content-Type": "image/png" }
        });

    const bytes = await imageResponse.arrayBuffer();

    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="kage-generated.png"'
      }
    });
  } catch (error) {
    return json({
      error: "Image generation failed.",
      detail: cleanText(error?.message, 500)
    }, 502);
  }
}

async function handleSpeech(request, env) {
  const body = await request.json();
  const text = cleanText(body.text, 4500).trim();

  if (!text) {
    return json({ error: "There is no text to speak." }, 400);
  }

  try {
    const result = await env.AI.run(
      VOICE_MODEL,
      {
        text,
        speaker: "asteria",
        encoding: "mp3"
      },
      {
        returnRawResponse: true
      }
    );

    if (result instanceof Response) {
      return new Response(result.body, {
        status: result.status,
        headers: {
          "Content-Type": result.headers.get("Content-Type") || "audio/mpeg",
          "Cache-Control": "no-store"
        }
      });
    }

    return new Response(result, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return json({
      error: "Voice generation failed.",
      detail: cleanText(error?.message, 500)
    }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        app: "Kage",
        aiBindingAvailable: Boolean(env.AI)
      });
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      if (!env.AI) {
        return json({ error: "The Workers AI binding named AI is missing." }, 503);
      }

      return handleChat(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/search") {
      return handleSearch(request);
    }

    if (request.method === "POST" && url.pathname === "/api/image") {
      if (!env.AI) {
        return json({ error: "The Workers AI binding named AI is missing." }, 503);
      }

      return handleImage(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/tts") {
      if (!env.AI) {
        return json({ error: "The Workers AI binding named AI is missing." }, 503);
      }

      return handleSpeech(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Kage is running, but the frontend assets are missing.", {
      status: 404
    });
  }
};
