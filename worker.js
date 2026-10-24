const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
  });
}

function newId() {
  return crypto.randomUUID();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (!env.DB || !env.AI) {
        return json({ error: "Backend is missing its database or AI binding." }, 500);
      }

      // Health check
      if (path === "/" && request.method === "GET") {
        return json({ name: "Kage API", status: "online" });
      }

      // List chats, recoverable deleted chats, or export
      if (path === "/api/chats" && request.method === "GET") {
        const includeDeleted = url.searchParams.get("deleted") === "1";
        const exportAll = url.searchParams.get("export") === "1";

        let sql = "SELECT * FROM chats";
        if (!exportAll) {
          sql += includeDeleted
            ? " WHERE deleted_at IS NOT NULL"
            : " WHERE deleted_at IS NULL";
        }
        sql += " ORDER BY updated_at DESC";

        const { results: chats } = await env.DB.prepare(sql).all();

        if (exportAll) {
          for (const chat of chats) {
            const result = await env.DB.prepare(
              "SELECT role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC"
            ).bind(chat.id).all();
            chat.messages = result.results;
          }
        }

        return json({ chats });
      }

      // Create a chat
      if (path === "/api/chats" && request.method === "POST") {
        const body = await request.json();
        const id = newId();
        const title = String(body.title || "New chat").slice(0, 100);

        await env.DB.prepare(
          "INSERT INTO chats (id, title) VALUES (?, ?)"
        ).bind(id, title).run();

        const chat = await env.DB.prepare(
          "SELECT * FROM chats WHERE id = ?"
        ).bind(id).first();

        return json({ chat }, 201);
      }

      // Routes for one chat
      const chatMatch = path.match(/^\/api\/chats\/([a-f0-9-]+)$/i);

      if (chatMatch) {
        const id = chatMatch[1];

        if (request.method === "GET") {
          const chat = await env.DB.prepare(
            "SELECT * FROM chats WHERE id = ? AND deleted_at IS NULL"
          ).bind(id).first();

          if (!chat) return json({ error: "Chat not found." }, 404);

          const { results: messages } = await env.DB.prepare(
            "SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC"
          ).bind(id).all();

          return json({ chat, messages });
        }

        if (request.method === "PATCH") {
          const body = await request.json();
          const title = String(body.title || "").trim().slice(0, 100);
          if (!title) return json({ error: "A chat name is required." }, 400);

          await env.DB.prepare(
            "UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL"
          ).bind(title, id).run();

          return json({ ok: true });
        }

        if (request.method === "DELETE") {
          await env.DB.prepare(
            "UPDATE chats SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL"
          ).bind(id).run();

          return json({ ok: true, recoverable: true });
        }
      }

      // Restore a soft-deleted chat
      const restoreMatch = path.match(/^\/api\/chats\/([a-f0-9-]+)\/restore$/i);
      if (restoreMatch && request.method === "POST") {
        await env.DB.prepare(
          "UPDATE chats SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(restoreMatch[1]).run();

        return json({ ok: true });
      }

      // Send a message and get a real AI response
      if (path === "/api/chat" && request.method === "POST") {
        const body = await request.json();
        const chatId = String(body.chatId || "");
        const message = String(body.message || "").trim();

        if (!chatId || !message) {
          return json({ error: "A chat ID and message are required." }, 400);
        }
        if (message.length > 12000) {
          return json({ error: "Message is too long. Limit: 12,000 characters." }, 400);
        }

        const chat = await env.DB.prepare(
          "SELECT * FROM chats WHERE id = ? AND deleted_at IS NULL"
        ).bind(chatId).first();

        if (!chat) return json({ error: "Chat not found." }, 404);

        const messageId = newId();
        await env.DB.prepare(
          "INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, 'user', ?)"
        ).bind(messageId, chatId, message).run();

        // Automatically name the chat from the first message.
        if (!chat.title || chat.title === "New chat") {
          await env.DB.prepare(
            "UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(message.slice(0, 36), chatId).run();
        } else {
          await env.DB.prepare(
            "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(chatId).run();
        }

        // Use recent conversation history as context.
        const { results: history } = await env.DB.prepare(
          "SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 24"
        ).bind(chatId).all();

        const messages = [
          {
            role: "system",
            content: "You are Kage, a helpful AI assistant. Be clear, honest, and direct. Never claim to have performed actions you have not performed."
          },
          ...history.reverse().map((item) => ({
            role: item.role,
            content: item.content
          }))
        ];

        let result;
        try {
          result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            messages,
            max_tokens: 1200
          });
        } catch (error) {
          // Do not leave a failed request pretending it succeeded.
          await env.DB.prepare(
            "DELETE FROM messages WHERE id = ?"
          ).bind(messageId).run();
          return json({
            error: "The AI request failed. Check your Cloudflare Workers AI access and usage limits."
          }, 502);
        }

        const reply = String(result?.response || "").trim();
        if (!reply) {
          return json({ error: "The AI returned an empty response. Try again." }, 502);
        }

        await env.DB.prepare(
          "INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, 'assistant', ?)"
        ).bind(newId(), chatId, reply).run();

        await env.DB.prepare(
          "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(chatId).run();

        const { results: savedMessages } = await env.DB.prepare(
          "SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC"
        ).bind(chatId).all();

        return json({ reply, messages: savedMessages });
      }

      return json({ error: "Route not found." }, 404);
    } catch (error) {
      return json({ error: "Server error. Check the Worker logs for details." }, 500);
    }
  }
};
