const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function systemPrompt() {
  return `
you are kage, a capable, casual, nonchalant teen-style ai.

PERSONALITY:
- talk naturally, in lowercase, with a relaxed bro-mode vibe.
- sound like a real person texting, not a customer-service bot.
- use slang naturally, not in every sentence.
- be direct, useful, confident, and concise when the question is simple.
- understand typos, slang, incomplete messages, and conversation context.
- don't repeat the user's question unnecessarily.
- don't say "that's not in my programming" or "i don't know what you want."
- never invent facts, capabilities, or search results.

CURRENT INFORMATION:
- today's date is ${currentDate()}.
- you can receive live web search results with the conversation.
- your training cutoff is NOT a reason to refuse a question or avoid answering.
- use relevant live search results to answer questions about current events, recent information, people, products, technology, and changing facts.
- distinguish verified current facts from information that cannot be verified.
- never pretend you searched if no usable results were provided.
- do not claim information is current merely because it sounds plausible.
- if live results are available, use them when relevant and include source URLs when useful.
- if a search fails, still answer what you can accurately answer. Briefly explain the limitation only when it matters to the question.
- don't make up citations, dates, statistics, or source contents.

ANSWERING:
- answer the actual question.
- use the entire conversation when interpreting the user's meaning.
- explain things clearly without unnecessary filler.
- for schoolwork, teach accurately at the appropriate level.
- for calculations, reason carefully and check the result.
- if you genuinely cannot determine what the user means, ask one specific clarification.
- prioritize correctness over pretending to know everything.
`.trim();
}

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
    .filter(m =>
      m &&
      ["system", "user", "assistant"].includes(m.role) &&
      typeof m.content === "string"
    )
    .slice(-30)
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, 12000)
    }));
}

function getLatestUserMessage(messages) {
  return [...messages].reverse().find(m => m.role === "user");
}

function makeSearchQuery(messages) {
  const recent = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-6)
    .map(m => `${m.role}: ${m.content}`);

  return recent.join("\n").slice(-1000);
}

function fallbackTitle(messages) {
  const last = getLatestUserMessage(messages);
  if (!last) return "New Chat";

  const ignored = new Set([
    "the", "and", "for", "that", "this", "with", "what", "how",
    "can", "you", "please", "make", "help", "me", "it", "just",
    "want", "need", "about", "a", "an", "to", "is", "are"
  ]);

  const words = last.content
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}' -]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const useful = words.filter(w => !ignored.has(w.toLowerCase()));
  const selected = (useful.length >= 2 ? useful : words).slice(0, 3);

  return selected.length
    ? selected.map(w => w[0].toUpperCase() + w.slice(1)).join(" ")
    : "New Chat";
}

function cleanTitle(value) {
  return String(value || "")
    .replace(/^["'`#\s]+|["'`#\s]+$/g, "")
    .replace(/^(title|chat title)\s*:\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ")
    .slice(0, 60);
}

async function runModel(env, messages, options = {}) {
  try {
    return await env.AI.run(MODEL, {
      messages,
      ...options
    });
  } catch (firstError) {
    try {
      return await env.AI.run(FALLBACK_MODEL, {
        messages,
        ...options
      });
    } catch (secondError) {
      throw new Error(
        `AI model failed: ${secondError?.message || firstError?.message || "unknown error"}`
      );
    }
  }
}

/*
 * Live search through Cloudflare Web Search API.
 * Requires the AI binding and an available AI Gateway search provider.
 */
async function searchWeb(env, query) {
  if (!env.AI || typeof env.AI.websearch !== "function") {
    return {
      results: [],
      error: "Cloudflare Web Search is not available on this binding."
    };
  }

  try {
    const response = await env.AI.websearch({
      gatewayId: "default",
      query: String(query || "").slice(0, 1024),
      provider: "ceramic",
      limit: 5
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        results: [],
        error: `Search returned HTTP ${response.status}. ${detail.slice(0, 300)}`
      };
    }

    const data = await response.json();

    const results = (Array.isArray(data.items) ? data.items : [])
      .filter(item => item && typeof item.url === "string")
      .slice(0, 5)
      .map(item => ({
        title: String(item.title || item.url).slice(0, 300),
        url: item.url,
        description: String(item.description || "").slice(0, 4000)
      }));

    return {
      results,
      error: results.length ? null : "The search provider returned no usable results."
    };
  } catch (error) {
    return {
      results: [],
      error: String(error?.message || error).slice(0, 500)
    };
  }
}

function searchInstructions(search) {
  if (!search.results.length) {
    return `
LIVE SEARCH STATUS: no usable web results were returned.
Do not claim that you verified the answer online.
Still answer the user's question accurately using your knowledge.
For questions requiring current facts, do not guess at dates, prices,
scores, breaking news, or other changing details.
If the missing live information prevents an accurate answer, state that
briefly and give the user the most useful accurate information you can.
Search error: ${search.error || "no results"}
`.trim();
  }

  const sourceText = search.results.map((item, index) => {
    return [
      `SOURCE ${index + 1}: ${item.title}`,
      `URL: ${item.url}`,
      `INFORMATION: ${item.description || "No description supplied."}`
    ].join("\n");
  }).join("\n\n");

  return `
LIVE WEB SEARCH RESULTS:
${sourceText}

HOW TO USE THESE RESULTS:
- Answer the user's actual question, not just summarize search results.
- Use relevant results as evidence for current information.
- Do not invent details that the results do not support.
- Prefer specific, relevant information over vague statements.
- Include clickable source URLs when they help verify factual claims.
- If the results don't answer the question, say what remains unverified.
- Do not tell the user that your training cutoff prevents you from answering.
`.trim();
}

async function generateTitle(env, messages) {
  try {
    const recent = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-10);

    const result = await runModel(env, [
      {
        role: "system",
        content:
          "create a natural title for this chat in exactly 2 or 3 words. " +
          "use the main topic from the recent conversation. " +
          "return only the title."
      },
      ...recent
    ], {
      max_tokens: 20,
      temperature: 0.2
    });

    const title = cleanTitle(result?.response);
    const count = title.split(/\s+/).filter(Boolean).length;

    return count >= 2 && count <= 3
      ? title
      : fallbackTitle(messages);
  } catch {
    return fallbackTitle(messages);
  }
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
        automaticSearch: true,
        date: currentDate()
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

      const messages = normalizeMessages(body.messages)
        .filter(m => m.role !== "system");

      if (!getLatestUserMessage(messages)) {
        return json({ error: "send a message first" }, 400);
      }

      /*
       * Search automatically for every message.
       * The frontend does not need a search button or search toggle.
       */
      const query = makeSearchQuery(messages);
      const search = await searchWeb(env, query);

      const modelMessages = [
        { role: "system", content: systemPrompt() },
        {
          role: "system",
          content: searchInstructions(search)
        },
        ...messages
      ];

      try {
        const stream = await runModel(env, modelMessages, {
          stream: true,
          max_tokens: 1200,
          temperature: 0.35,
          top_p: 0.9
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Content-Type-Options": "nosniff",
            "X-Kage-Search": search.results.length
              ? "completed"
              : "failed"
          }
        });
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
