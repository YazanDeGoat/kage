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
you are kage, a capable ai assistant with a natural, lowercase,
nonchalant bro-mode personality.

YOUR PERSONALITY:
- write in lowercase by default.
- sound relaxed, sharp, direct, and natural, like a chill person texting.
- use "bro", "twin", and slang only when they fit naturally.
- do not force slang into every sentence.
- do not sound corporate, robotic, overly enthusiastic, or like a generic chatbot.
- don't begin with filler like "certainly", "of course", or "as an ai".
- don't repeat the user's question just to fill space.
- keep simple answers short. explain complicated things properly.
- match the user's tone without mocking them.
- understand typos, abbreviations, slang, misspellings, and incomplete sentences.
- use earlier messages to understand follow-ups. don't act like each message is unrelated.
- infer the most reasonable meaning from context when possible.
- ask one specific clarification only when the meaning genuinely cannot be determined.

NEVER USE THESE COP-OUTS:
- never say "that's not in my programming."
- never say "i don't know what you want" when context makes the request understandable.
- never blame your training data for avoiding a question.
- never pretend you completed an action you did not complete.
- never invent features, facts, search results, citations, or capabilities.
- if something fails, explain the actual limitation briefly and still help with what you can do.

LIVE INFORMATION:
- current date: ${today()}.
- the backend may provide fresh web-search results below.
- use those results for current facts, changing information, recent news, products,
  people, technology, prices, events, and other time-sensitive topics.
- use actual search-result evidence instead of guessing.
- include useful source URLs in your answer when search results are supplied.
- never invent a URL or claim that you visited a source you did not receive.
- if search fails, answer what you can accurately answer from existing knowledge.
- if a current fact cannot be verified, be transparent about that specific fact.
- your training cutoff is not a reason to stop helping or refuse an answer.
- never claim you performed a live search unless search results were actually provided.

ANSWER QUALITY:
- answer the actual request first.
- be useful, accurate, and specific.
- don't give generic advice when concrete steps are possible.
- for code requests, give complete working code where appropriate.
- for school help, explain clearly and at the right level.
- for math, check your calculations.
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
    .filter(message =>
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
    if (messages[i].role === "user") return messages[i];
  }
  return null;
}

function fallbackTitle(messages) {
  const latest = lastUserMessage(messages);
  if (!latest) return "New Chat";

  const ignored = new Set([
    "the", "and", "for", "that", "this", "with", "what", "how",
    "can", "you", "please", "make", "help", "me", "it", "just",
    "want", "need", "about", "a", "an", "to", "is", "are",
    "i", "my", "do", "does", "could", "would", "should", "tell"
  ]);

  const words = latest.content
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}' -]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const useful = words.filter(word => !ignored.has(word.toLowerCase()));
  const selected = (useful.length >= 2 ? useful : words).slice(0, 3);

  if (selected.length === 0) return "New Chat";
  if (selected.length === 1) selected.push("Chat");

  return selected
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanTitle(value) {
  let title = String(value || "")
    .replace(/^["'`#\s]+|["'`#\s]+$/g, "")
    .replace(/^(title|chat title)\s*:\s*/i, "")
    .replace(/[.!?,:;]+$/g, "");

  const words = title.split(/\s+/).filter(Boolean).slice(0, 3);

  if (words.length < 2) return "";
  return words.join(" ").slice(0, 60);
}

async function runModel(env, model, input, options = {}) {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw new Error("Workers AI binding is missing. Check wrangler.jsonc.");
  }

  return env.AI.run(model, input, options);
}

async function runTextModel(env, messages, options = {}) {
  try {
    return await runModel(env, MODEL, { messages, ...options });
  } catch (firstError) {
    try {
      return await runModel(env, FALLBACK_MODEL, { messages, ...options });
    } catch (secondError) {
      throw new Error(
        `both text models failed: ${
          secondError?.message || firstError?.message || "unknown error"
        }`
      );
    }
  }
}

function recentContext(messages) {
  return messages
    .slice(-8)
    .map(message => `${message.role}: ${message.content}`)
    .join("\n")
    .slice(-5000);
}

async function createSearchQuery(env, messages) {
  const latest = lastUserMessage(messages);
  if (!latest) return "";

  try {
    const result = await runTextModel(env, [
      {
        role: "system",
        content: `
write one concise web search query for the user's latest message.
use the recent conversation to resolve references like "it", "that one",
"what about now", and follow-up questions.
search for current information relevant to the actual request.
don't answer the question.
return only the search query, with no quotation marks or explanation.
if the user asks for a timeless creative task with no factual research need,
return exactly: NO_SEARCH
`.trim()
      },
      {
        role: "user",
        content: `recent conversation:\n${recentContext(messages)}\n\nlatest user message:\n${latest.content}`
      }
    ], {
      max_tokens: 80,
      temperature: 0.1
    });

    const query = String(result?.response || "")
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .replace(/^(search query|query)\s*:\s*/i, "")
      .trim();

    if (!query || /^NO_SEARCH$/i.test(query)) return "";
    return query.slice(0, 1024);
  } catch {
    // Still attempt a search using the user's actual words.
    return latest.content.slice(0, 1024);
  }
}

async function searchWeb(env, query) {
  if (!query) {
    return { results: [], error: null, query: "" };
  }

  if (!env.AI || typeof env.AI.websearch !== "function") {
    return {
      results: [],
      error: "Workers AI websearch is unavailable. Check the AI binding and gateway setup.",
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
      const status = response?.status || "unknown";
      const details = response
        ? await response.text().catch(() => "")
        : "";

      return {
        results: [],
        error: `Web Search API returned HTTP ${status}. ${details.slice(0, 350)}`,
        query
      };
    }

    const data = await response.json();
    const rawResults = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.results)
        ? data.results
        : [];

    const results = rawResults
      .filter(item => item && typeof item.url === "string")
      .map(item => {
        let url;
        try {
          url = new URL(item.url);
          if (!["http:", "https:"].includes(url.protocol)) return null;
        } catch {
          return null;
        }

        return {
          title: String(item.title || url.hostname).slice(0, 250),
          url: url.href,
          description: String(
            item.description || item.snippet || item.content || ""
          ).slice(0, 1800)
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    return {
      results,
      error: results.length ? null : "The search provider returned no usable results.",
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
    return `
WEB SEARCH:
No web search was necessary for this request.
Answer the user normally. Do not claim that you searched the web.
`.trim();
  }

  if (!search.results.length) {
    return `
WEB SEARCH STATUS:
A live search was attempted for: ${search.query}
No usable results were returned.
Do not invent results or claim that you verified the answer online.
Answer what you can accurately answer. For facts that require current
verification, briefly explain what could not be verified.
Search error: ${search.error || "no results returned"}
`.trim();
  }

  const results = search.results.map((item, index) => `
SOURCE ${index + 1}
Title: ${item.title}
URL: ${item.url}
Details: ${item.description || "No description provided."}
`.trim()).join("\n\n");

  return `
LIVE WEB SEARCH RESULTS
Query: ${search.query}

${results}

USE THESE RESULTS:
- Use relevant sources to answer the user's actual question.
- Never invent details not supported by the conversation or results.
- If sources disagree, explain the disagreement.
- Include useful source URLs in the answer.
- Prefer primary or authoritative sources when the results include them.
- If these results do not establish an answer, clearly state what remains unverified.
- Do not merely dump the search results without answering the user.
`.trim();
}

async function generateTitle(env, messages) {
  if (!messages.length) return "New Chat";

  try {
    const recent = messages.slice(-12).map(message => ({
      role: message.role,
      content: message.content.slice(0, 1500)
    }));

    const result = await runTextModel(env, [
      {
        role: "system",
        content: `
create a short, natural title for this conversation.
use exactly 2 or 3 words.
summarize the main topic of the conversation, not just the latest message.
use title case.
return only the title. no punctuation or explanation.
`.trim()
      },
      ...recent
    ], {
      max_tokens: 18,
      temperature: 0.15
    });

    return cleanTitle(result?.response) || fallbackTitle(messages);
  } catch {
    return fallbackTitle(messages);
  }
}

function getImageAttachment(attachments) {
  if (!Array.isArray(attachments)) return null;

  for (const attachment of attachments.slice(0, 4)) {
    if (!attachment || typeof attachment.dataUrl !== "string") continue;

    const match = attachment.dataUrl.match(
      /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i
    );

    if (!match) continue;

    const base64 = match[2].replace(/\s/g, "");
    if (base64.length > 5_500_000) continue;

    return {
      name: String(attachment.name || "attached image").slice(0, 150),
      mimeType: match[1].toLowerCase().replace("image/jpg", "image/jpeg"),
      dataUrl: `data:${match[1].toLowerCase().replace("image/jpg", "image/jpeg")};base64,${base64}`
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

  const index = copy.map(message => message.role).lastIndexOf("user");
  if (index < 0) return copy;

  const text = copy[index].content;
  copy[index] = {
    role: "user",
    content: [
      { type: "text", text: `${text}\n\nplease inspect the attached image and answer based on what is visible.` },
      { type: "image_url", image_url: { url: image.dataUrl } }
    ]
  };

  return copy;
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
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
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return withCors(json({
        ok: true,
        service: "kage",
        model: MODEL,
        fallbackModel: FALLBACK_MODEL,
        visionModel: VISION_MODEL,
        liveSearchBinding: Boolean(env.AI && typeof env.AI.websearch === "function"),
        date: today()
      }));
    }

    if (url.pathname === "/api/title" && request.method === "POST") {
      try {
        const body = await request.json();
        const messages = normalizeMessages(body.messages);
        const title = await generateTitle(env, messages);
        return withCors(json({ title }));
      } catch {
        return withCors(json({ title: "New Chat" }));
      }
    }

    if (url.pathname === "/api/search" && request.method === "POST") {
      try {
        const body = await request.json();
        const query = String(body.query || "").trim().slice(0, 1024);
        if (!query) return withCors(json({ results: [], error: "enter a search query" }, 400));

        const search = await searchWeb(env, query);
        return withCors(json({
          query: search.query,
          results: search.results,
          resultCount: search.results.length,
          error: search.error
        }));
      } catch (error) {
        return withCors(json({
          results: [],
          error: String(error?.message || error).slice(0, 500)
        }, 500));
      }
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return withCors(json({ error: "invalid request body" }, 400));
      }

      const messages = normalizeMessages(body.messages);

      if (!lastUserMessage(messages)) {
        return withCors(json({ error: "send a message first" }, 400));
      }

      // The search toggle controls whether Kage searches automatically.
      let search = { results: [], error: null, query: "" };

      if (body.search !== false) {
        const query = await createSearchQuery(env, messages);
        search = await searchWeb(env, query);
      }

      const image = getImageAttachment(body.attachments);
      const model = image ? VISION_MODEL : MODEL;

      const modelMessages = [
        { role: "system", content: systemPrompt() },
        { role: "system", content: buildSearchContext(search) },
        ...messages
      ];

      const finalMessages = image
        ? addImageToMessages(modelMessages, image)
        : modelMessages;

      try {
        let result;

        if (image) {
          try {
            result = await runModel(env, VISION_MODEL, {
              messages: finalMessages,
              stream: true,
              max_tokens: 1200,
              temperature: 0.35
            });
          } catch {
            return withCors(json({
              error: "the image model failed or isn't enabled for this account. text chat and live search can still work."
            }, 502));
          }
        } else {
          result = await runTextModel(env, finalMessages, {
            stream: true,
            max_tokens: 1400,
            temperature: 0.35,
            top_p: 0.9
          });
        }

        const headers = new Headers({
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Content-Type-Options": "nosniff",
          "X-Kage-Search": search.results.length ? "completed" : "no-results",
          "X-Kage-Search-Count": String(search.results.length),
          "X-Kage-Model": model
        });

        return withCors(new Response(result, { headers }));
      } catch (error) {
        return withCors(json({
          error: "kage couldn't generate a response",
          details: String(error?.message || error).slice(0, 500)
        }, 502));
      }
    }

    if (env.ASSETS) {
      return withCors(await env.ASSETS.fetch(request));
    }

    return withCors(new Response("not found", { status: 404 }));
  }
};
