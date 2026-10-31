const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_MESSAGES = 32;
const MAX_MESSAGE_LENGTH = 12000;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function systemPrompt() {
  return `
you are kage, a capable ai assistant with a natural, lowercase, nonchalant bro-mode personality.

PERSONALITY
- write in lowercase by default, unless formatting, names, code, or clarity call for otherwise.
- sound relaxed, sharp, direct, and natural. use "bro" or "twin" only when it fits.
- never force slang into every sentence. don't sound corporate, robotic, or like a generic chatbot.
- don't begin with filler such as "certainly", "of course", or "as an ai".
- answer the actual request first. keep simple answers short and complicated answers thorough.
- understand typos, abbreviations, slang, misspellings, and incomplete messages.
- use the conversation history to understand follow-ups. don't make the user repeat context you already have.
- infer the most reasonable meaning when possible; ask one clear question only when essential.

QUALITY
- solve the user's actual goal with concrete, useful details.
- reason carefully, check calculations, and identify assumptions when they matter.
- for coding requests, provide complete working implementations and explain integration only when useful.
- never claim you performed an action you did not perform.
- never invent facts, features, search results, sources, or capabilities.
- when something fails, explain the real limitation briefly and still help with the closest useful alternative.

LIVE INFORMATION
- current date: ${today()}.
- live search may be supplied below. use it for current facts, recent events, changing prices, products, services, and anything that may have changed.
- distinguish sourced facts from inference. use useful source URLs when available.
- never claim you searched if no search results were supplied.
- if search fails, still answer accurately from available knowledge and state only the relevant uncertainty.

RESPONSE STYLE
- prefer clear, organized answers over filler.
- use bullets or numbered steps when they improve readability.
- match the user's requested language, tone, and level of detail.
- don't overpromise.
`.trim();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function normalizeMessages(input) {
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      message =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string"
    )
    .slice(-MAX_MESSAGES)
    .map(message => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH)
    }));
}

function lastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i];
    }
  }

  return null;
}

function fallbackTitle(messages) {
  const latest = lastUserMessage(messages);

  if (!latest) return "New Chat";

  const ignored = new Set([
    "the", "and", "for", "that", "this", "with", "what",
    "how", "can", "you", "please", "make", "help", "me",
    "it", "just", "want", "need", "about", "a", "an",
    "to", "is", "are", "i", "my", "do", "does", "could",
    "would", "should", "tell"
  ]);

  const words = latest.content
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}' -]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const useful = words.filter(
    word => !ignored.has(word.toLowerCase())
  );

  const selected = (
    useful.length >= 2 ? useful : words
  ).slice(0, 3);

  if (!selected.length) return "New Chat";

  if (selected.length === 1) {
    selected.push("Chat");
  }

  return selected
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanTitle(value) {
  const title = String(value || "")
    .replace(/^["'`#\s]+|["'`#\s]+$/g, "")
    .replace(/^(title|chat title)\s*:\s*/i, "")
    .replace(/[.!?,:;]+$/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  return title.length >= 2 ? title.join(" ") : "";
}

async function runModel(env, model, input, options = {}) {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw new Error(
      "Workers AI binding is missing. Check wrangler.jsonc."
    );
  }

  return env.AI.run(model, input, options);
}

async function runTextModel(env, messages, options = {}) {
  try {
    return await runModel(
      env,
      MODEL,
      { messages, ...options }
    );
  } catch (firstError) {
    try {
      return await runModel(
        env,
        FALLBACK_MODEL,
        { messages, ...options }
      );
    } catch (secondError) {
      throw new Error(
        `both text models failed: ${
          secondError?.message ||
          firstError?.message ||
          "unknown error"
        }`
      );
    }
  }
}

function recentContext(messages) {
  return messages
    .slice(-10)
    .map(message => `${message.role}: ${message.content}`)
    .join("\n")
    .slice(-6000);
}

async function createSearchQuery(env, messages) {
  const latest = lastUserMessage(messages);

  if (!latest) return "";

  try {
    const result = await runTextModel(
      env,
      [
        {
          role: "system",
          content: [
            "create one concise web search query for the latest user message.",
            "use recent conversation to resolve follow-ups like 'it', 'that one', and 'what about now'.",
            "search for current information relevant to the request.",
            "if it is purely creative or does not need external facts, return exactly NO_SEARCH.",
            "return only the query, with no explanation."
          ].join(" ")
        },
        {
          role: "user",
          content:
            `recent conversation:\n${recentContext(messages)}\n\n` +
            `latest user message:\n${latest.content}`
        }
      ],
      {
        max_tokens: 80,
        temperature: 0.1
      }
    );

    const query = String(result?.response || "")
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .replace(/^(search query|query)\s*:\s*/i, "")
      .trim();

    if (!query || /^NO_SEARCH$/i.test(query)) {
      return "";
    }

    return query.slice(0, 1024);
  } catch {
    return latest.content.slice(0, 1024);
  }
}

async function searchWeb(env, query) {
  if (!query) {
    return {
      results: [],
      error: null,
      query: ""
    };
  }

  if (!env.AI || typeof env.AI.websearch !== "function") {
    return {
      results: [],
      error:
        "Workers AI websearch is unavailable. " +
        "Check the AI binding and gateway setup.",
      query
    };
  }

  try {
    const response = await env.AI.websearch({
      gatewayId: "default",
      provider: "ceramic",
      query: query.slice(0, 1024),
      limit: 5
    });

    if (!response || !response.ok) {
      const details = response
        ? await response.text().catch(() => "")
        : "";

      return {
        results: [],
        error:
          `Web Search API returned HTTP ${
            response?.status || "unknown"
          }. ${details.slice(0, 350)}`,
        query
      };
    }

    const data = await response.json();

    const raw = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.results)
        ? data.results
        : [];

    const results = raw
      .filter(
        item => item && typeof item.url === "string"
      )
      .map(item => {
        try {
          const url = new URL(item.url);

          if (!["http:", "https:"].includes(url.protocol)) {
            return null;
          }

          return {
            title: String(
              item.title || url.hostname
            ).slice(0, 250),
            url: url.href,
            description: String(
              item.description ||
              item.snippet ||
              item.content ||
              ""
            ).slice(0, 1800)
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .slice(0, 5);

    return {
      results,
      error: results.length
        ? null
        : "The search provider returned no usable results.",
      query
    };
  } catch (error) {
    return {
      results: [],
      error: String(error?.message || error).slice(0, 500),
      query
    };
  }
}

function buildSearchContext(search) {
  if (!search.query) {
    return [
      "WEB SEARCH:",
      "No web search was necessary for this request.",
      "Do not claim that you searched."
    ].join(" ");
  }

  if (!search.results.length) {
    return [
      "WEB SEARCH STATUS:",
      `A live search was attempted for: ${search.query}`,
      "No usable results were returned.",
      "Do not invent results or claim verification.",
      `Search error: ${search.error || "no results returned"}`
    ].join("\n");
  }

  const sources = search.results
    .map((source, index) => [
      `SOURCE ${index + 1}`,
      `Title: ${source.title}`,
      `URL: ${source.url}`,
      `Details: ${source.description || "No description provided."}`
    ].join("\n"))
    .join("\n\n");

  return [
    "LIVE WEB SEARCH RESULTS",
    `Query: ${search.query}`,
    "",
    sources,
    "",
    "Use these results to answer the actual question.",
    "Never invent details not supported by the conversation or results.",
    "Include useful source URLs.",
    "Prefer primary or authoritative sources.",
    "Explain uncertainty if sources do not establish an answer.",
    "Do not merely dump the results."
  ].join("\n");
}

async function generateTitle(env, messages) {
  if (!messages.length) {
    return "New Chat";
  }

  try {
    const recent = messages
      .slice(-12)
      .map(message => ({
        role: message.role,
        content: message.content.slice(0, 1500)
      }));

    const result = await runTextModel(
      env,
      [
        {
          role: "system",
          content:
            "create a natural title for the main topic of this conversation. " +
            "use exactly 2 or 3 short words. title case. " +
            "return only the title, no punctuation or explanation."
        },
        ...recent
      ],
      {
        max_tokens: 18,
        temperature: 0.15
      }
    );

    return cleanTitle(result?.response) ||
      fallbackTitle(messages);
  } catch {
    return fallbackTitle(messages);
  }
}

function getImageAttachment(attachments) {
  if (!Array.isArray(attachments)) {
    return null;
  }

  for (const attachment of attachments.slice(0, 4)) {
    if (
      !attachment ||
      typeof attachment.dataUrl !== "string"
    ) {
      continue;
    }

    const match = attachment.dataUrl.match(
      /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i
    );

    if (!match) continue;

    const base64 = match[2].replace(/\s/g, "");

    if (base64.length > 5500000) continue;

    const mime = match[1]
      .toLowerCase()
      .replace("image/jpg", "image/jpeg");

    return {
      name: String(
        attachment.name || "attached image"
      ).slice(0, 150),
      mimeType: mime,
      dataUrl: `data:${mime};base64,${base64}`
    };
  }

  return null;
}

function addImageToMessages(messages, image) {
  if (!image) return messages;

  const copy = messages.map(message => ({
    role: message.role,
    content: message.content
  }));

  const index = copy
    .map(message => message.role)
    .lastIndexOf("user");

  if (index < 0) return copy;

  copy[index] = {
    role: "user",
    content: [
      {
        type: "text",
        text:
          `${copy[index].content}\n\n` +
          "inspect the attached image and answer based on what is visible."
      },
      {
        type: "image_url",
        image_url: {
          url: image.dataUrl
        }
      }
    ]
  };

  return copy;
}

function withCors(response) {
  const headers = new Headers(response.headers);

  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(
        new Response(null, { status: 204 })
      );
    }

    if (
      url.pathname === "/api/health" &&
      request.method === "GET"
    ) {
      return withCors(
        json({
          ok: true,
          service: "kage",
          model: MODEL,
          fallbackModel: FALLBACK_MODEL,
          visionModel: VISION_MODEL,
          liveSearchBinding: Boolean(
            env.AI &&
            typeof env.AI.websearch === "function"
          ),
          date: today()
        })
      );
    }

    if (
      url.pathname === "/api/title" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();
        const messages = normalizeMessages(body.messages);

        return withCors(
          json({
            title: await generateTitle(env, messages)
          })
        );
      } catch {
        return withCors(
          json({ title: "New Chat" })
        );
      }
    }

    if (
      url.pathname === "/api/search" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();
        const query = String(body.query || "")
          .trim()
          .slice(0, 1024);

        if (!query) {
          return withCors(
            json(
              {
                results: [],
                error: "enter a search query"
              },
              400
            )
          );
        }

        const search = await searchWeb(env, query);

        return withCors(
          json({
            query: search.query,
            results: search.results,
            resultCount: search.results.length,
            error: search.error
          })
        );
      } catch (error) {
        return withCors(
          json(
            {
              results: [],
              error: String(
                error?.message || error
              ).slice(0, 500)
            },
            500
          )
        );
      }
    }

    if (
      url.pathname === "/api/chat" &&
      request.method === "POST"
    ) {
      let body;

      try {
        body = await request.json();
      } catch {
        return withCors(
          json(
            { error: "invalid request body" },
            400
          )
        );
      }

      const messages = normalizeMessages(body.messages);

      if (!lastUserMessage(messages)) {
        return withCors(
          json(
            { error: "send a message first" },
            400
          )
        );
      }

      // Search behavior is controlled by Kage, not a user-facing toggle.
      const query = await createSearchQuery(env, messages);
      const search = await searchWeb(env, query);
      const image = getImageAttachment(body.attachments);
      const model = image ? VISION_MODEL : MODEL;

      const modelMessages = [
        {
          role: "system",
          content: systemPrompt()
        },
        {
          role: "system",
          content: buildSearchContext(search)
        },
        ...messages
      ];

      const finalMessages = image
        ? addImageToMessages(modelMessages, image)
        : modelMessages;

      try {
        let result;

        if (image) {
          try {
            result = await runModel(
              env,
              VISION_MODEL,
              {
                messages: finalMessages,
                stream: true,
                max_tokens: 1200,
                temperature: 0.35
              }
            );
          } catch {
            return withCors(
              json(
                {
                  error:
                    "the image model failed or isn't enabled " +
                    "for this account. text chat and live search can still work."
                },
                502
              )
            );
          }
        } else {
          result = await runTextModel(
            env,
            finalMessages,
            {
              stream: true,
              max_tokens: 1600,
              temperature: 0.35,
              top_p: 0.9
            }
          );
        }

        const headers = new Headers({
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Content-Type-Options": "nosniff",
          "X-Kage-Search": search.results.length
            ? "completed"
            : query
              ? "no-results"
              : "not-needed",
          "X-Kage-Search-Count": String(
            search.results.length
          ),
          "X-Kage-Model": model
        });

        return withCors(
          new Response(result, { headers })
        );
      } catch (error) {
        return withCors(
          json(
            {
              error: "kage couldn't generate a response",
              details: String(
                error?.message || error
              ).slice(0, 500)
            },
            502
          )
        );
      }
    }

    if (env.ASSETS) {
      return withCors(
        await env.ASSETS.fetch(request)
      );
    }

    return withCors(
      new Response("not found", { status: 404 })
    );
  }
};
