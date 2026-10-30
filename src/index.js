const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";

const PERSONALITY = `
you are kage. talk like a real, chill teenager texting, not a customer support bot.

YOUR VIBE:
- write in lowercase. this includes sentence beginnings, headings, and casual replies.
- sound relaxed, nonchalant, direct, and natural.
- use casual wording like "yo", "bro", "ngl", "tbh", "bet", "lowkey", and "fr" when it fits naturally.
- do not force slang into every sentence. natural beats cringe.
- keep simple answers short. don't turn a simple question into an essay.
- when someone tells you something, react naturally instead of giving a generic assistant response.
- don't constantly say "how can i help you today", "certainly", "of course", "i'd be happy to", or "as an ai".
- don't repeat the user's question back to them.
- don't sound overly polite, robotic, formal, corporate, or scripted.
- explain complicated things clearly without losing your casual voice.
- match the user's energy without copying every single word they use.

UNDERSTANDING:
- use the full conversation to understand what the user means.
- understand slang, typos, abbreviations, incomplete sentences, and speech-to-text mistakes.
- understand references to earlier messages, including "it", "that", "the other one", "same thing", and "make it better".
- do not act like every message is a brand-new conversation.
- when the meaning is clear enough, figure it out and answer directly.
- do not say "that's not in my programming", "i don't know what you want", "i don't understand what you're talking about", or similar generic dismissals.
- if a request is genuinely unclear, ask one short question about the specific missing detail.
- if you lack a tool or capability, explain the actual limitation briefly and offer the closest useful alternative.
- never pretend to have performed an action that you did not perform.

INSTRUCTIONS:
- follow the user's requested format and constraints as closely as possible.
- give the actual answer or working code when requested, not just a plan.
- be useful, accurate, and honest.
- never make up facts or claim you searched when you didn't.
- follow applicable safety requirements.
`.trim();

const MAX_MESSAGES = 24;
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

/*
 * Search automatically when the request likely needs current information.
 * Ordinary questions can go directly to the model to avoid unnecessary delay.
 */
function needsLiveSearch(text) {
  const query = String(text || "").toLowerCase();

  const currentInfoPatterns = [
    /\b(latest|newest|recent|breaking|current|currently|right now)\b/,
    /\b(today|tonight|this week|this month|this year|yesterday|tomorrow)\b/,
    /\b(news|headlines|updates|live score|live results|standings|schedule)\b/,
    /\b(weather|forecast|temperature outside)\b/,
    /\b(price right now|current price|stock price|exchange rate)\b/,
    /\b(who won|who is winning|what happened|what's happening)\b/,
    /\b(as of \d{4}|in \d{4}|released yet|release date)\b/,
    /\b(search the web|look it up|look online|google it|find online)\b/,
    /\b(latest version|new update|recent update|is .* still available)\b/,
    /\b(near me|open now|opening hours|available today)\b/
  ];

  return currentInfoPatterns.some(pattern => pattern.test(query));
}

function normalizeTitle(title) {
  const words = String(title || "")
    .replace(/^["'`#\s]+|["'`#\s]+$/g, "")
    .replace(/^(title|chat title)\s*:\s*/i, "")
    .replace(/[.!?]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.slice(0, 3).join(" ").slice(0, 60);
}

function fallbackTitle(messages) {
  const lastUser = [...messages]
    .reverse()
    .find(message => message.role === "user");

  if (!lastUser) return "New Chat";

  const words = lastUser.content
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}' -]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const ignored = new Set([
    "the", "and", "for", "that", "this", "with", "what",
    "how", "can", "you", "please", "make", "help", "me",
    "it", "just", "want", "need", "about", "a", "an", "to"
  ]);

  const useful = words.filter(word => !ignored.has(word.toLowerCase()));
  const selected = (useful.length >= 2 ? useful : words).slice(0, 3);

  if (!selected.length) return "New Chat";

  return selected
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function generateTitle(env, messages) {
  const conversation = messages
    .filter(message => ["user", "assistant"].includes(message.role))
    .slice(-12)
    .map(message => ({
      role: message.role,
      content: message.content.slice(0, 900)
    }));

  const result = await env.AI.run(MODEL, {
    messages: [
      {
        role: "system",
        content:
          "create a title for this entire conversation. use exactly 2 or 3 meaningful words. " +
          "summarize the current main topic, taking recent messages into account. " +
          "update the topic when the conversation changes. " +
          "use title case. return only the title."
      },
      ...conversation,
      {
        role: "user",
        content: "give me the current 2-3 word conversation title."
      }
    ],
    max_tokens: 16,
    temperature: 0.2
  });

  const title = normalizeTitle(result?.response || "");
  const count = title.split(/\s+/).filter(Boolean).length;

  return count >= 2 && count <= 3
    ? title
    : fallbackTitle(messages);
}

/*
 * Fetch recent web results.
 * Search is only called automatically when the question appears time-sensitive
 * or the user explicitly asks to look something up.
 */
async function searchWeb(query) {
  const cleaned = String(query || "").trim().slice(0, 400);
  if (!cleaned) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);

  try {
    const url =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(cleaned);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KageAI/1.0)",
        "Accept": "text/html"
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];
    const pattern =
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = pattern.exec(html)) && results.length < 5) {
      let href = match[1];

      try {
        if (href.startsWith("//")) href = "https:" + href;

        const parsed = new URL(href, "https://duckduckgo.com");

        if (parsed.hostname.includes("duckduckgo.com")) {
          const redirected = parsed.searchParams.get("uddg");
          if (redirected) href = decodeURIComponent(redirected);
        }
      } catch {
        continue;
      }

      const title = match[2]
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;|&#39;/g, "'")
        .trim();

      if (!title || !/^https?:\/\//i.test(href)) continue;

      results.push({
        title,
        url: href
      });
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function searchContext(results) {
  if (!results.length) {
    return [
      "live search was attempted, but no usable results were retrieved.",
      "do not pretend the search succeeded or invent current facts.",
      "answer using what you know and briefly explain that the latest details could not be verified."
    ].join(" ");
  }

  return [
    "live web search results:",
    ...results.map((item, index) =>
      `${index + 1}. ${item.title}\n${item.url}`
    ),
    "use these results to answer the current question.",
    "do not claim a source says something unless the available information supports it.",
    "include useful source URLs in your response when relevant."
  ].join("\n\n");
}

function extractLastUserMessage(messages) {
  return [...messages]
    .reverse()
    .find(message => message.role === "user");
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
        automaticSearch: true
      });
    }

    if (url.pathname === "/api/title" && request.method === "POST") {
      try {
        const body = await request.json();
        const messages = normalizeMessages(body.messages);

        if (!messages.length) {
          return json({ title: "New Chat" });
        }

        return json({
          title: await generateTitle(env, messages)
        });
      } catch {
        return json({
          title: "New Chat"
        });
      }
    }

    if (url.pathname === "/api/search" && request.method === "POST") {
      try {
        const body = await request.json();
        const results = await searchWeb(body.query || "");

        return json({
          results,
          searched: true,
          resultCount: results.length
        });
      } catch {
        return json({
          results: [],
          searched: true,
          resultCount: 0
        });
      }
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const incoming = normalizeMessages(body.messages);

        if (!incoming.length) {
          return json({ error: "send a message first" }, 400);
        }

        const conversation = incoming.filter(
          message => message.role !== "system"
        );

        const lastUser = extractLastUserMessage(conversation);

        if (!lastUser) {
          return json({ error: "send a message first" }, 400);
        }

        /*
         * Automatic search. The frontend toggle is not required.
         * Search runs only for requests likely to benefit from fresh information.
         */
        const shouldSearch = needsLiveSearch(lastUser.content);

        let results = [];

        if (shouldSearch) {
          results = await searchWeb(lastUser.content);
        }

        const messages = [
          {
            role: "system",
            content: PERSONALITY
          }
        ];

        if (shouldSearch) {
          messages.push({
            role: "system",
            content: searchContext(results)
          });
        }

        messages.push(...conversation);

        const stream = await env.AI.run(MODEL, {
          messages,
          stream: true,
          max_tokens: 700,
          temperature: 0.7,
          top_p: 0.9
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Content-Type-Options": "nosniff",
            "X-Kage-Search": shouldSearch
              ? (results.length ? "completed" : "no-results")
              : "not-needed"
          }
        });
      } catch (error) {
        return json({
          error: "kage hit a problem handling that request",
          details: error instanceof Error
            ? error.message
            : "unknown error"
        }, 500);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("not found", { status: 404 });
  }
};
