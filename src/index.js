const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

const PERSONALITY = `
you are kage, a capable ai that talks like a chill teenager texting.

PERSONALITY:
- use lowercase naturally, including headings when possible.
- sound relaxed, casual, confident, direct, and human.
- use bro, ngl, tbh, fr, lowkey, and similar slang only when natural.
- never force slang into every sentence or sound like a parody of a teenager.
- keep simple answers short and useful.
- explain complicated questions clearly without sounding formal or robotic.
- respond naturally to jokes, casual messages, and the conversation's mood.
- don't repeat the user's question before answering.
- don't use scripted customer-service phrases.
- avoid unnecessary disclaimers and long introductions.

UNDERSTANDING:
- read the full conversation and use its context.
- understand typos, slang, abbreviations, and incomplete sentences.
- resolve references to earlier messages when the meaning is reasonably clear.
- answer the actual question, not a different question.
- don't say "that's not in my programming" or "i don't know what you want."
- if something is genuinely ambiguous, ask one short, specific clarification.
- never invent facts, sources, search results, or capabilities.

ACCURACY:
- prioritize correctness over speed.
- use supplied live search results when available for current information.
- distinguish verified facts from estimates or uncertainty.
- if sources disagree, explain the disagreement briefly.
- do not pretend search succeeded when it failed.
- for current facts, prefer recent and authoritative sources.
- if you cannot verify a claim, say so plainly rather than guessing.
- follow the user's requested format and constraints.
- follow applicable safety requirements.
`.trim();

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 12000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(message =>
      message &&
      ["system", "user", "assistant"].includes(message.role) &&
      typeof message.content === "string"
    )
    .slice(-MAX_MESSAGES)
    .map(message => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH)
    }));
}

function lastUserMessage(messages) {
  return [...messages].reverse().find(m => m.role === "user");
}

function needsLiveSearch(text) {
  const q = String(text || "").toLowerCase().trim();

  if (!q) return false;

  const patterns = [
    /\b(search|google|look up|look it up|find online|check online|browse|verify online)\b/,
    /\b(latest|newest|recent|breaking|current|currently|right now|as of today)\b/,
    /\b(today|tonight|this week|this month|this year|yesterday|tomorrow)\b/,
    /\b(news|headlines|live updates|live score|live results|standings|schedule)\b/,
    /\b(weather|forecast|temperature outside)\b/,
    /\b(current price|price today|prices|stock price|exchange rate)\b/,
    /\b(who won|who is winning|what happened|what's happening)\b/,
    /\b(release date|released yet|new update|latest version|new version)\b/,
    /\b(available now|still available|in stock|open now|near me)\b/,
    /\b(best .* (right now|in 2026|this year))\b/,
    /\b(2026|2027)\b/
  ];

  return patterns.some(pattern => pattern.test(q));
}

function normalizeTitle(value) {
  const words = String(value || "")
    .replace(/^["'`#\s]+|["'`#\s]+$/g, "")
    .replace(/^(title|chat title)\s*:\s*/i, "")
    .replace(/[.!?]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.slice(0, 3).join(" ").slice(0, 60);
}

function fallbackTitle(messages) {
  const last = lastUserMessage(messages);
  if (!last) return "New Chat";

  const words = last.content
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}' -]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const ignored = new Set([
    "the", "and", "for", "that", "this", "with", "what", "how",
    "can", "you", "please", "make", "help", "me", "it", "just",
    "want", "need", "about", "a", "an", "to", "is", "are"
  ]);

  const useful = words.filter(word => !ignored.has(word.toLowerCase()));
  const chosen = (useful.length >= 2 ? useful : words).slice(0, 3);

  return chosen.length
    ? chosen.map(w => w[0].toUpperCase() + w.slice(1)).join(" ")
    : "New Chat";
}

async function runModel(env, messages, options = {}) {
  let firstError;

  try {
    return await env.AI.run(MODEL, {
      messages,
      ...options
    });
  } catch (error) {
    firstError = error;
  }

  try {
    return await env.AI.run(FALLBACK_MODEL, {
      messages,
      ...options
    });
  } catch (fallbackError) {
    throw new Error(
      `Primary model failed: ${firstError?.message || firstError}. ` +
      `Fallback model failed: ${fallbackError?.message || fallbackError}.`
    );
  }
}

async function generateTitle(env, messages) {
  const conversation = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-12)
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, 800)
    }));

  try {
    const result = await runModel(env, [
      {
        role: "system",
        content:
          "give this conversation a clear title in exactly 2 or 3 words. " +
          "summarize the current main topic, considering recent messages. " +
          "use title case. return only the title."
      },
      ...conversation,
      {
        role: "user",
        content: "what is the current 2-3 word title for this conversation?"
      }
    ], {
      max_tokens: 20,
      temperature: 0.2
    });

    const title = normalizeTitle(result?.response);
    const count = title.split(/\s+/).filter(Boolean).length;

    return count >= 2 && count <= 3
      ? title
      : fallbackTitle(messages);
  } catch {
    return fallbackTitle(messages);
  }
}

/*
 * Uses Cloudflare's actual Web Search binding instead of scraping HTML.
 * Requires Web Search API access through the account's default AI Gateway.
 */
async function searchWeb(env, query) {
  const cleaned = String(query || "").trim().slice(0, 1024);

  if (!cleaned) {
    return { results: [], error: "empty_query" };
  }

  if (!env.AI || typeof env.AI.websearch !== "function") {
    return {
      results: [],
      error: "web_search_binding_unavailable"
    };
  }

  try {
    const response = await env.AI.websearch({
      gatewayId: "default",
      query: cleaned,
      provider: "ceramic",
      limit: 5
    });

    if (!response.ok) {
      return {
        results: [],
        error: `web_search_http_${response.status}`
      };
    }

    const data = await response.json();

    const results = (Array.isArray(data?.items) ? data.items : [])
      .filter(item => item && typeof item.url === "string")
      .slice(0, 5)
      .map(item => ({
        title: String(item.title || item.url).slice(0, 300),
        url: item.url,
        description: String(item.description || "").slice(0, 1200)
      }));

    return {
      results,
      error: results.length ? null : "no_search_results",
      metadata: data?.metadata || null
    };
  } catch (error) {
    return {
      results: [],
      error: String(error?.message || error).slice(0, 500)
    };
  }
}

function makeSearchContext(search) {
  if (search.error || !search.results.length) {
    return [
      "automatic web search was attempted but did not return usable results.",
      "do not claim that you verified current information.",
      "answer what you can accurately answer from your existing knowledge.",
      "if the question depends on live information, briefly explain that the live result could not be verified."
    ].join(" ");
  }

  return [
    "the following results were retrieved from a live web search.",
    "use their titles, descriptions, and URLs as evidence for the user's question.",
    "prefer relevant and recent sources; do not invent details missing from the results.",
    "include the actual source URLs when they help the user verify the answer.",
    ...search.results.map((item, index) =>
      `${index + 1}. ${item.title}\n` +
      `url: ${item.url}\n` +
      `description: ${item.description || "no description returned"}`
    )
  ].join("\n\n");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "kage",
        model: MODEL,
        fallbackModel: FALLBACK_MODEL,
        automaticSearch: true
      });
    }

    if (url.pathname === "/api/title" && request.method === "POST") {
      try {
        const body = await request.json();
        const messages = normalizeMessages(body.messages);

        return json({
          title: messages.length
            ? await generateTitle(env, messages)
            : "New Chat"
        });
      } catch {
        return json({ title: "New Chat" });
      }
    }

    if (url.pathname === "/api/search" && request.method === "POST") {
      try {
        const body = await request.json();
        const search = await searchWeb(env, body.query || "");

        return json({
          results: search.results,
          searched: true,
          resultCount: search.results.length,
          error: search.error
        });
      } catch (error) {
        return json({
          results: [],
          searched: true,
          resultCount: 0,
          error: String(error?.message || error)
        }, 500);
      }
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid request body" }, 400);
      }

      const incoming = normalizeMessages(body.messages);
      const conversation = incoming.filter(m => m.role !== "system");
      const latest = lastUserMessage(conversation);

      if (!latest) {
        return json({ error: "send a message first" }, 400);
      }

      /*
       * Search automatically when the message needs up-to-date information.
       * Ordinary questions go straight to the model to avoid needless delays.
       */
      const shouldSearch = needsLiveSearch(latest.content);
      let search = { results: [], error: null };

      if (shouldSearch) {
        search = await searchWeb(env, latest.content);
      }

      const messages = [
        { role: "system", content: PERSONALITY }
      ];

      if (shouldSearch) {
        messages.push({
          role: "system",
          content: makeSearchContext(search)
        });
      }

      messages.push(...conversation);

      try {
        const stream = await runModel(env, messages, {
          stream: true,
          max_tokens: 1200,
          temperature: 0.45,
          top_p: 0.9
        });

        const headers = {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Content-Type-Options": "nosniff",
          "X-Kage-Search": shouldSearch
            ? (search.results.length ? "completed" : "failed")
            : "not-needed"
        };

        return new Response(stream, { headers });
      } catch (error) {
        return json({
          error: "kage couldn't generate a response",
          details: String(error?.message || error)
        }, 502);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("not found", { status: 404 });
  }
};
