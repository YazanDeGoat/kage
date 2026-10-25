"use strict";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8"
};

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS
  });
}

function id() {
  return crypto.randomUUID();
}

function cleanText(value, maxLength = 12000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isValidId(value) {
  return /^[a-f0-9-]{36}$/i.test(value);
}

function authorized(request, env) {
  const expected = env.KAGE_ACCESS_KEY;
  const provided = request.headers.get("Authorization") || "";

  if (!expected || expected.length < 16) return false;
  return provided === `Bearer ${expected}`;
}

async function getChat(env, chatId, includeDeleted = false) {
  const sql = includeDeleted
    ? "SELECT * FROM chats WHERE id = ?"
    : "SELECT * FROM chats WHERE id = ? AND deleted_at IS NULL";

  return env.DB.prepare(sql).bind(chatId).first();
}

async function getMessages(env, chatId) {
  const result = await env.DB.prepare(`
    SELECT id, role, content, created_at
    FROM messages
    WHERE chat_id = ?
    ORDER BY rowid ASC
  `).bind(chatId).all();

  return result.results || [];
}

async function runChatModel(env, messages) {
  // Try the configured primary model, then a second model if the first
  // is unavailable on this account. Availability and usage limits vary.
  try {
    return await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages,
      max_tokens: 1400
    });
  } catch (firstError) {
    try {
      return await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages,
        max_tokens: 1200
      });
    } catch {
      throw new Error("No configured chat model completed the request.");
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // A public health check reveals no credentials.
    if (path === "/" && request.method === "GET") {
      return reply({
        name: "Kage API",
        status: "online",
        authenticatedApi: true
      });
    }

    if (!env.DB || !env.AI) {
      return reply({
        error: "The Worker is missing its DB or AI binding."
      }, 503);
    }

    if (!env.KAGE_ACCESS_KEY || env.KAGE_ACCESS_KEY.length < 16) {
      return reply({
        error: "Kage is not configured. Add a KAGE_ACCESS_KEY secret in Cloudflare Worker settings."
      }, 503);
    }

    if (!authorized(request, env)) {
      return reply({
        error: "Unauthorized. Check the private access key in Kage Settings."
      }, 401);
    }

    try {
      // List chats, recently deleted chats, or export all conversations.
      if (path === "/api/chats" && request.method === "GET") {
        const deleted = url.searchParams.get("deleted") === "1";
        const exportAll = url.searchParams.get("export") === "1";

        let sql = "SELECT id, title, created_at, updated_at, deleted_at FROM chats";

        if (!exportAll) {
          sql += deleted
            ? " WHERE deleted_at IS NOT NULL"
            : " WHERE deleted_at IS NULL";
        }

        sql += " ORDER BY updated_at DESC";

        const result = await env.DB.prepare(sql).all();
        const chats = result.results || [];

        if (exportAll) {
          for (const chat of chats) {
            chat.messages = await getMessages(env, chat.id);
          }
        }

        return reply({ chats });
      }

      // Create a new conversation.
      if (path === "/api/chats" && request.method === "POST") {
        const body = await request.json();
        const chatId = id();
        const title = cleanText(body.title || "New chat", 100) || "New chat";

        await env.DB.prepare(
          "INSERT INTO chats (id, title) VALUES (?, ?)"
        ).bind(chatId, title).run();

        return reply({
          chat: await getChat(env, chatId)
        }, 201);
      }

      // Create or update a chat title, read a chat, or soft-delete it.
      const chatMatch = path.match(/^\/api\/chats\/([a-f0-9-]{36})$/i);

      if (chatMatch) {
        const chatId = chatMatch[1];

        if (request.method === "GET") {
          const chat = await getChat(env, chatId);

          if (!chat) return reply({ error: "Chat not found." }, 404);

          return reply({
            chat,
            messages: await getMessages(env, chatId)
          });
        }

        if (request.method === "PATCH") {
          const body = await request.json();
          const title = cleanText(body.title, 100);

          if (!title) return reply({ error: "Enter a chat name." }, 400);

          const chat = await getChat(env, chatId);
          if (!chat) return reply({ error: "Chat not found." }, 404);

          await env.DB.prepare(`
            UPDATE chats
            SET title = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL
          `).bind(title, chatId).run();

          return reply({ ok: true });
        }

        if (request.method === "DELETE") {
          const chat = await getChat(env, chatId);
          if (!chat) return reply({ error: "Chat not found." }, 404);

          await env.DB.prepare(`
            UPDATE chats
            SET deleted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(chatId).run();

          return reply({ ok: true, recoverable: true });
        }
      }

      // Restore a soft-deleted conversation.
      const restoreMatch = path.match(
        /^\/api\/chats\/([a-f0-9-]{36})\/restore$/i
      );

      if (restoreMatch && request.method === "POST") {
        const chatId = restoreMatch[1];

        await env.DB.prepare(`
          UPDATE chats
          SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(chatId).run();

        return reply({ ok: true });
      }

      // Edit a message and remove later messages, so the conversation
      // can continue from the edited point.
      const messageMatch = path.match(
        /^\/api\/chats\/([a-f0-9-]{36})\/messages\/([a-f0-9-]{36})$/i
      );

      if (messageMatch) {
        const chatId = messageMatch[1];
        const messageId = messageMatch[2];
        const chat = await getChat(env, chatId);

        if (!chat) return reply({ error: "Chat not found." }, 404);

        const message = await env.DB.prepare(`
          SELECT id, role, content, rowid AS row_number
          FROM messages
          WHERE id = ? AND chat_id = ?
        `).bind(messageId, chatId).first();

        if (!message) return reply({ error: "Message not found." }, 404);

        if (request.method === "PATCH") {
          const body = await request.json();
          const content = cleanText(body.content, 12000);

          if (!content) return reply({ error: "Message cannot be empty." }, 400);
          if (message.role !== "user") {
            return reply({ error: "Only user messages can be edited." }, 400);
          }

          await env.DB.prepare(
            "UPDATE messages SET content = ? WHERE id = ? AND chat_id = ?"
          ).bind(content, messageId, chatId).run();

          await env.DB.prepare(
            "DELETE FROM messages WHERE chat_id = ? AND rowid > ?"
          ).bind(chatId, message.row_number).run();

          await env.DB.prepare(
            "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(chatId).run();

          return reply({
            ok: true,
            messages: await getMessages(env, chatId)
          });
        }

        if (request.method === "DELETE") {
          await env.DB.prepare(
            "DELETE FROM messages WHERE chat_id = ? AND rowid >= ?"
          ).bind(chatId, message.row_number).run();

          await env.DB.prepare(
            "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(chatId).run();

          return reply({
            ok: true,
            messages: await getMessages(env, chatId)
          });
        }
      }

      // Chat completion. For regeneration, use the existing last user
      // message instead of inserting a duplicate.
      if (path === "/api/chat" && request.method === "POST") {
        const body = await request.json();
        const chatId = cleanText(body.chatId, 36);
        const regenerate = body.regenerate === true;
        const messageText = cleanText(body.message, 12000);

        if (!isValidId(chatId)) {
          return reply({ error: "Invalid chat ID." }, 400);
        }

        if (!regenerate && !messageText) {
          return reply({ error: "Enter a message." }, 400);
        }

        const chat = await getChat(env, chatId);
        if (!chat) return reply({ error: "Chat not found." }, 404);

        if (!regenerate) {
          await env.DB.prepare(`
            INSERT INTO messages (id, chat_id, role, content)
            VALUES (?, ?, 'user', ?)
          `).bind(id(), chatId, messageText).run();

          if (!chat.title || chat.title === "New chat") {
            await env.DB.prepare(`
              UPDATE chats
              SET title = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(messageText.slice(0, 42), chatId).run();
          }
        } else {
          const lastUser = await env.DB.prepare(`
            SELECT rowid AS row_number
            FROM messages
            WHERE chat_id = ? AND role = 'user'
            ORDER BY rowid DESC
            LIMIT 1
          `).bind(chatId).first();

          if (!lastUser) {
            return reply({ error: "There is no user message to regenerate." }, 400);
          }

          await env.DB.prepare(`
            DELETE FROM messages
            WHERE chat_id = ? AND rowid > ?
          `).bind(chatId, lastUser.row_number).run();
        }

        const messagesInDb = await getMessages(env, chatId);

        const history = [
          {
            role: "system",
            content:
              "You are Kage, a helpful AI assistant. Be direct, thoughtful, and honest. " +
              "Do not claim to browse, generate files, or perform actions unless the tools actually did so. " +
              "If search context is provided by the user, use it carefully and state uncertainty when needed."
          },
          ...messagesInDb.slice(-24).map((item) => ({
            role: item.role,
            content: item.content
          }))
        ];

        let modelResult;

        try {
          modelResult = await runChatModel(env, history);
        } catch {
          return reply({
            error: "The AI model request failed. Check Workers AI availability and account usage."
          }, 502);
        }

        const answer = cleanText(modelResult?.response, 20000);

        if (!answer) {
          return reply({ error: "The AI model returned an empty response." }, 502);
        }

        await env.DB.prepare(`
          INSERT INTO messages (id, chat_id, role, content)
          VALUES (?, ?, 'assistant', ?)
        `).bind(id(), chatId, answer).run();

        await env.DB.prepare(
          "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(chatId).run();

        return reply({
          reply: answer,
          messages: await getMessages(env, chatId)
        });
      }

      // Encyclopedia search via Wikipedia's public API.
      // This is useful reference search, not a general-purpose web index.
      if (path === "/api/search" && request.method === "GET") {
        const query = cleanText(url.searchParams.get("q"), 180);

        if (!query) return reply({ error: "Enter a search query." }, 400);

        const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
        searchUrl.searchParams.set("action", "query");
        searchUrl.searchParams.set("list", "search");
        searchUrl.searchParams.set("srsearch", query);
        searchUrl.searchParams.set("format", "json");
        searchUrl.searchParams.set("utf8", "1");
        searchUrl.searchParams.set("srlimit", "5");

        const response = await fetch(searchUrl.toString(), {
          headers: { "User-Agent": "KageAI/1.0 (personal assistant)" }
        });

        if (!response.ok) {
          return reply({ error: "Search service is temporarily unavailable." }, 502);
        }

        const data = await response.json();
        const results = (data.query?.search || []).map((item) => ({
          title: item.title,
          snippet: String(item.snippet || "").replace(/<[^>]*>/g, ""),
          url: "https://en.wikipedia.org/wiki/" +
            encodeURIComponent(item.title.replace(/ /g, "_"))
        }));

        return reply({ results });
      }

      // Image generation using Cloudflare Workers AI.
      if (path === "/api/image" && request.method === "POST") {
        const body = await request.json();
        const prompt = cleanText(body.prompt, 2048);

        if (!prompt) return reply({ error: "Describe the image you want." }, 400);

        try {
          const result = await env.AI.run(
            "@cf/black-forest-labs/flux-1-schnell",
            { prompt, steps: 4 }
          );

          if (!result?.image) {
            return reply({ error: "The image model returned no image." }, 502);
          }

          return reply({
            dataURI: `data:image/jpeg;base64,${result.image}`
          });
        } catch {
          return reply({
            error: "Image generation failed. Check model availability and your account's AI usage."
          }, 502);
        }
      }

      return reply({ error: "Route not found." }, 404);
    } catch (error) {
      console.error("Kage API error:", error);
      return reply({ error: "The backend encountered an error. Check Cloudflare Worker logs." }, 500);
    }
  }
};
