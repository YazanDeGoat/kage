const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

const SYSTEM_PROMPT = `
You are Kage, a helpful AI assistant.

PERSONALITY:
- Write naturally, casually, and confidently.
- Be clear, direct, and useful.
- Match the user's tone when appropriate.
- Avoid unnecessary introductions and repetitive explanations.
- Admit uncertainty instead of inventing facts.
- Help with programming, learning, research, writing, and problem solving.
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

function corsHeaders(request) {
  return {
    "Access-Control-Allow-Origin": new URL(request.url).origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

async function searchWeb(query) {
  const url =
    "https://html.duckduckgo.com/html/?q=" +
    encodeURIComponent(query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 KageAI/1.0"
    }
  });

  if (!response.ok) {
    throw new Error("The search provider did not respond.");
  }

  const html = await response.text();
  const results = [];
  const pattern =
    /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while (
    (match = pattern.exec(html)) !== null &&
    results.length < 5
  ) {
    const link = match[1];
    const title = match[2]
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .trim();

    if (title && link.startsWith("http")) {
      results.push({ title, url: link });
    }
  }

  return results;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/api/health") {
      return json({
        app: "Kage",
        status: "online",
        aiConfigured: Boolean(env.AI)
      });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      if (!env.AI) {
        return json(
          { error: "The Cloudflare AI binding is missing." },
          503
        );
      }

      try {
        const body = await request.json();

        const messages = Array.isArray(body.messages)
          ? body.messages.slice(-24)
          : [];

        const useSearch = body.search === true;

        if (!messages.length) {
          return json({ error: "No messages were provided." }, 400);
        }

        const cleanedMessages = [];

        for (const message of messages) {
          if (
            !message ||
            !["user", "assistant"].includes(message.role) ||
            typeof message.content !== "string"
          ) {
            continue;
          }

          cleanedMessages.push({
            role: message.role,
            content: message.content.slice(0, 12000)
          });
        }

        const lastUser = [...cleanedMessages]
          .reverse()
          .find(message => message.role === "user");

        if (!lastUser) {
          return json({ error: "A user message is required." }, 400);
        }

        let searchResults = [];

        if (useSearch) {
          try {
            searchResults = await searchWeb(lastUser.content);
          } catch {
            searchResults = [];
          }
        }

        let system = SYSTEM_PROMPT;

        if (searchResults.length) {
          system +=
            "\n\nWEB SEARCH RESULTS:\n" +
            searchResults
              .map(
                (item, index) =>
                  `${index + 1}. ${item.title}\n${item.url}`
              )
              .join("\n\n") +
            "\n\nUse these results when relevant. Cite their URLs in your answer.";
        } else if (useSearch) {
          system +=
            "\n\nThe user requested web search, but no results were retrieved. " +
            "Do not pretend you searched successfully.";
        }

        const response = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: system },
            ...cleanedMessages
          ],
          stream: true,
          max_tokens: 2048
        });

        return new Response(response, {
          headers: {
            ...headers,
            "Content-Type": "text/event-stream; charset=utf-8",
            "X-Content-Type-Options": "nosniff"
          }
        });
      } catch (error) {
        return json(
          {
            error:
              "Kage couldn't complete that request. " +
              "Check the AI service and try again."
          },
          500
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "API route not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
