const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

const KAGE_RULES = `
you are kage, a capable conversational ai assistant.

PERSONALITY:
- write in lowercase by default.
- sound calm, casual, nonchalant, and natural, like a smart teenager texting.
- be direct and useful. avoid corporate language, excessive enthusiasm, and unnecessary explanations.
- match the user's language and requested format.
- do not force slang into every sentence.

UNDERSTANDING CONTEXT:
- use the entire available conversation to understand what the user means.
- interpret short messages, slang, typos, misspellings, pronouns, and incomplete sentences using the surrounding context.
- understand follow-up messages as follow-ups to the previous topic unless the user clearly changes topics.
- remember relevant details from earlier messages in the current conversation.
- when the user's intent is reasonably clear, act on that interpretation instead of asking them to repeat themselves.
- when a request has several reasonable interpretations, choose the most likely useful interpretation and proceed.
- if an essential detail is genuinely missing, ask one short, specific question about that detail.
- never respond with generic statements such as "that's not in my programming", "i don't know what you want", or "i don't understand what you're asking".
- if you are uncertain, explain what you can infer and give the best useful answer you can.
- never pretend to understand information that is genuinely unavailable.

FOLLOWING INSTRUCTIONS:
- follow the user's instructions about the task, format, tone, and output as closely as possible.
- handle the actual request instead of replacing it with generic advice.
- when asked to modify code, preserve unrelated functionality and provide complete usable code for the requested changes.
- do not claim to have performed actions you did not perform.
- do not claim a feature works unless the available tools and backend actually support it.
- if a requested capability is unavailable, explain the specific limitation briefly and offer the closest working alternative.
- be honest when information is unknown. do not invent facts.
- follow applicable safety requirements.

ANSWER QUALITY:
- answer the specific question first.
- use the conversation history to avoid making the user repeat information.
- keep simple answers short and complex answers detailed enough to be useful.
- do not repeatedly apologize or give generic refusal-like responses when a helpful answer is possible.
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      message =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string"
    )
    .slice(-30)
    .map(message => ({
      role: message.role,
      content: message.content.slice(0, 30000)
    }));
}

function lastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

function fallbackTitle(messages) {
  const stopWords = new Set([
    "the", "and", "for", "that", "this", "with", "from", "what",
    "when", "where", "which", "who", "why", "how", "can", "could",
    "would", "should", "please", "help", "want", "need", "make",
    "tell", "give", "show", "have", "has", "about", "into", "your",
    "you", "are", "was", "were", "just", "like", "its", "it's",
    "but", "not", "now", "then", "also", "get", "got", "does",
    "did", "use", "using", "me", "my", "i", "we", "they", "it",
    "a", "an", "to", "of", "in", "on", "at", "is", "be", "as",
    "or", "if", "do", "im", "i'm", "we're", "dont", "don't"
  ]);

  const recentUserText = messages
    .filter(message => message.role === "user")
    .slice(-5)
    .map(message => message.content)
    .join(" ");

  const words = (recentUserText.toLowerCase().match(/[a-z0-9+#.-]+/g) || [])
    .filter(word => word.length > 1 && !stopWords.has(word));

  const unique = [];
  for (const word of words.reverse()) {
    if (!unique.includes(word)) unique.push(word);
    if (unique.length === 3) break;
  }

  const selected = unique.reverse();

  while (selected.length < 2) {
    selected.unshift(selected.length === 0 ? "new" : "chat");
  }

  return selected.slice(-3).join(" ");
}

function normalizeTitle(raw, messages) {
  const cleaned = String(raw || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^title\s*:\s*/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.!?,:;]+$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+# -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);

  if (words.length >= 2 && words.length <= 3) {
    return words.join(" ");
  }

  if (words.length > 3) {
    return words.slice(0, 3).join(" ");
  }

  return fallbackTitle(messages);
}

async function createTitle(env, messages) {
  const recent = messages.slice(-12);

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content:
            "create a concise title for this conversation. " +
            "return exactly 2 or 3 meaningful words in lowercase. " +
            "describe the conversation's main topic, using the entire " +
            "conversation rather than only the first message. " +
            "no quotation marks, punctuation, explanation, or prefix."
        },
        {
          role: "user",
          content: recent
            .map(message => `${message.role}: ${message.content}`)
            .join("\n")
            .slice(-18000)
        }
      ],
      max_tokens: 20,
      temperature: 0.2
    });

    const raw =
      typeof result === "string"
        ? result
        : result?.response || result?.result?.response || "";

    return normalizeTitle(raw, messages);
  } catch {
    return fallbackTitle(messages);
  }
}

async function searchWeb(query) {
  if (!query) return "";

  try {
    const url =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(query.slice(0, 400));

    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; KageAI/1.0)"
      }
    });

    if (!response.ok) return "";

    const html = await response.text();

    const results = [];
    const pattern =
      /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/gi;

    let match;

    while ((match = pattern.exec(html)) && results.length < 5) {
      const clean = value =>
        value
          .replace(/<[^>]*>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;|&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim();

      results.push({
        title: clean(match[2]),
        url: match[1],
        snippet: clean(match[3])
      });
    }

    if (!results.length) return "";

    return "\n\nweb search results:\n" + results
      .map(
        (result, index) =>
          `${index + 1}. ${result.title}\n${result.url}\n${result.snippet}`
      )
      .join("\n\n");
  } catch {
    return "";
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "kage" });
    }

    if (request.method === "POST" && url.pathname === "/api/title") {
      try {
        const body = await request.json();
        const messages = cleanMessages(body.messages);

        if (!messages.length) {
          return json({ title: "new chat" });
        }

        const title = await createTitle(env, messages);
        return json({ title });
      } catch {
        return json({ title: "new chat" });
      }
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const body = await request.json();
        const messages = cleanMessages(body.messages);

        if (!messages.length) {
          return json({ error: "send a message first" }, 400);
        }

        let conversation = [...messages];

        if (body.search === true || body.searching === true) {
          const query = lastUserMessage(conversation);
          const searchResults = await searchWeb(query);

          if (searchResults) {
            const lastIndex = conversation.length - 1;

            conversation[lastIndex] = {
              ...conversation[lastIndex],
              content:
                conversation[lastIndex].content +
                "\n\nuse these search results when relevant. " +
                "separate verified information from uncertainty." +
                searchResults
            };
          }
        }

        const modelMessages = [
          { role: "system", content: KAGE_RULES },
          ...conversation
        ];

        const stream = await env.AI.run(MODEL, {
          messages: modelMessages,
          stream: true,
          max_tokens: 2048,
          temperature: 0.65
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            "x-content-type-options": "nosniff"
          }
        });
      } catch (error) {
        return json(
          {
            error:
              "kage couldn't complete that request. check the worker logs and try again.",
            detail: String(error?.message || error).slice(0, 300)
          },
          500
        );
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("not found", { status: 404 });
  }
};
