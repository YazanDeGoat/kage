const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

const KAGE_SYSTEM_PROMPT = `
you are kage, a helpful and capable ai assistant.

PERSONALITY:
- write in lowercase by default.
- sound relaxed, nonchalant, natural, and conversational, like a smart teenager texting.
- be direct. avoid corporate wording, fake enthusiasm, unnecessary disclaimers, and forced slang.
- adapt your length to the user's request.

UNDERSTANDING CONTEXT:
- understand what the user means, not only the literal wording they typed.
- interpret typos, shorthand, slang, casual language, incomplete sentences, and speech-to-text errors.
- use the conversation history to resolve references such as "it", "that", "the other one", "same thing", "do that", "make it better", and "what i said earlier".
- remember relevant information from earlier messages in the current conversation.
- when the intent is reasonably clear, make the best reasonable interpretation and answer directly.
- don't ask the user to repeat information they already provided.
- don't say "that's not in my programming", "i don't know what you want", "i don't understand what you're asking", or similar generic dismissals.
- if a request is genuinely ambiguous, ask one short, specific clarification question instead of giving a generic refusal.
- if you cannot perform an action because the necessary tool, permission, model, or information is unavailable, explain the real limitation briefly and offer the closest useful alternative.
- never pretend that an action was completed when it wasn't.

FOLLOWING INSTRUCTIONS:
- follow the user's requested format, tone, language, and constraints as closely as possible.
- for code requests, provide complete, usable code when possible.
- be proactive about solving the actual task instead of merely describing a plan.
- don't invent facts, capabilities, sources, or results.
- follow applicable safety requirements.
`.trim();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || "unknown error");
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(item =>
      item &&
      ["system", "user", "assistant"].includes(item.role) &&
      typeof item.content === "string"
    )
    .slice(-32)
    .map(item => ({
      role: item.role,
      content: item.content.slice(0, 30000)
    }));
}

function normalizeTitle(title) {
  const cleaned = String(title || "")
    .replace(/^["'`#\s]+|["'`#\s]+$/g, "")
    .replace(/^(chat title|title)\s*:\s*/i, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);
  return words.slice(0, 3).join(" ").slice(0, 60);
}

function fallbackTitle(messages) {
  const lastUser = [...messages].reverse().find(item => item.role === "user");
  if (!lastUser) return "New Chat";

  const words = lastUser.content
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
  const selected = (useful.length >= 2 ? useful : words).slice(0, 3);

  if (!selected.length) return "New Chat";

  return selected
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function generateTitle(env, messages) {
  const history = messages
    .filter(item => item.role === "user" || item.role === "assistant")
    .slice(-16)
    .map(item => ({
      role: item.role,
      content: item.content.slice(0, 1500)
    }));

  const titleMessages = [
    {
      role: "system",
      content: [
        "create a short title for this entire conversation.",
        "use exactly 2 or 3 meaningful words.",
        "summarize the current main topic, using the latest messages to update the topic when it changes.",
        "do not simply copy the first sentence or first word from the conversation.",
        "use title case.",
        "return only the title, with no quotes, explanation, punctuation, or label."
      ].join(" ")
    },
    ...history,
    {
      role: "user",
      content: "return the best current 2-3 word title for this conversation."
    }
  ];

  const result = await env.AI.run(MODEL, {
    messages: titleMessages,
    max_tokens: 20
  });

  const raw =
    result?.response ??
    result?.result?.response ??
    result?.generated_text ??
    "";

  const title = normalizeTitle(raw);
  const count = title.split(/\s+/).filter(Boolean).length;

  if (count >= 2 && count <= 3) return title;
  return fallbackTitle(messages);
}

async function searchWeb(query) {
  const trimmed = String(query || "").trim().slice(0, 300);
  if (!trimmed) return [];

  try {
    const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(trimmed);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KageAI/1.0)"
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];
    const pattern = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = pattern.exec(html)) && results.length < 5) {
      const href = match[1];
      const title = match[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

      if (!title || !href) continue;

      results.push({ title, url: href });
    }

    return results;
  } catch {
    return [];
  }
}

function formatSearchResults(results) {
  if (!results.length) {
    return "Web search was requested, but no usable search results were retrieved. Do not pretend you searched successfully.";
  }

  return "Search results retrieved for this request:\n" +
    results.map((item, index) =>
      `${index + 1}. ${item.title}\n${item.url}`
    ).join("\n\n");
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
      return json({ ok: true, service: "kage" });
    }

    if (url.pathname === "/api/title" && request.method === "POST") {
      try {
        const body = await request.json();
        const messages = normalizeMessages(body.messages);

        if (!messages.length) return json({ title: "New Chat" });

        const title = await generateTitle(env, messages);
        return json({ title });
      } catch (error) {
        return json({
          title: "New Chat",
          error: errorMessage(error)
        }, 200);
      }
    }

    if (url.pathname === "/api/search" && request.method === "POST") {
      try {
        const body = await request.json();
        const results = await searchWeb(body.query || "");
        return json({ results });
      } catch (error) {
        return json({ results: [], error: errorMessage(error) }, 200);
      }
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        let messages = normalizeMessages(body.messages);

        if (!messages.length) {
          return json({ error: "a message is required" }, 400);
        }

        // The backend system prompt is always applied, even if the frontend omits it.
        messages = messages.filter(item => item.role !== "system");

        const lastUserMessage = [...messages].reverse().find(item => item.role === "user");

        if (body.search && lastUserMessage) {
          const results = await searchWeb(lastUserMessage.content);
          const searchContext = formatSearchResults(results);

          messages.push({
            role: "system",
            content: [
              "web search context for the user's latest request:",
              searchContext,
              "when using these results, distinguish retrieved information from your own knowledge.",
              "if the search returned no results, be honest about that."
            ].join("\n\n")
          });
        }

        const finalMessages = [
          {
            role: "system",
            content: KAGE_SYSTEM_PROMPT
          },
          ...messages
        ];

        const stream = await env.AI.run(MODEL, {
          messages: finalMessages,
          stream: true,
          max_tokens: 2048
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Content-Type-Options": "nosniff"
          }
        });
      } catch (error) {
        return json({
          error: "kage couldn't complete the request",
          details: errorMessage(error)
        }, 500);
      }
    }

    // Preserve static asset serving for the existing frontend.
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("not found", { status: 404 });
  }
};
