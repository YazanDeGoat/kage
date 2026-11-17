const CHAT_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

const SYSTEM_PROMPT = `
you are kage, an advanced personal ai assistant.

personality:
- communicate naturally and casually.
- use lowercase for normal conversational writing.
- be intelligent, creative, accurate, and direct.
- understand the user's conversation and context.
- follow safe and supported instructions.
- explain complicated subjects clearly.
- never invent facts, sources, or completed actions.
- preserve capitalization in code, filenames, commands, and urls.
- use the user's saved memory when relevant.
- answer the actual question.
`;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

async function getUser(ctx) {
  try {
    if (!ctx?.access) return null;

    const identity = await ctx.access.getIdentity();

    return identity?.email?.toLowerCase() || null;
  } catch {
    return null;
  }
}

async function requireUser(ctx) {
  const user = await getUser(ctx);

  if (!user) {
    return {
      response: json({
        error: "authentication required"
      }, 401)
    };
  }

  return { user };
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return [];

  return input.slice(-30).map(message => {
    if (
      !message ||
      !["user", "assistant"].includes(message.role)
    ) {
      return null;
    }

    if (typeof message.content === "string") {
      return {
        role: message.role,
        content: message.content.slice(0, 20000)
      };
    }

    if (!Array.isArray(message.content)) return null;

    const parts = message.content.slice(0, 8).map(part => {
      if (part.type === "text") {
        return {
          type: "text",
          text: String(part.text || "").slice(0, 20000)
        };
      }

      if (
        part.type === "image_url" &&
        typeof part.image_url?.url === "string" &&
        part.image_url.url.startsWith("data:image/")
      ) {
        return {
          type: "image_url",
          image_url: {
            url: part.image_url.url
          }
        };
      }

      if (
        part.type === "file" &&
        typeof part.file_data === "string" &&
        part.file_data.startsWith("data:application/pdf;")
      ) {
        return {
          type: "file",
          file_data: part.file_data,
          filename: String(part.filename || "document.pdf")
        };
      }

      return null;
    }).filter(Boolean);

    return parts.length
      ? { role: message.role, content: parts }
      : null;
  }).filter(Boolean);
}

async function handleChat(request, env) {
  if (!env.AI) {
    return json({ error: "workers ai binding missing" }, 503);
  }

  const body = await request.json();

  const messages = cleanMessages(body.messages);

  if (!messages.length) {
    return json({ error: "no valid messages" }, 400);
  }

  const memory = String(body.memory || "").slice(0, 6000);

  const system =
    SYSTEM_PROMPT +
    (memory ? "\n\nuser memory:\n" + memory : "");

  const input = {
    messages: [
      {
        role: "system",
        content: system
      },
      ...messages
    ],

    stream: true,
    max_completion_tokens: 1600,
    temperature: 0.7,

    chat_template_kwargs: {
      enable_thinking: false
    }
  };

  if (body.webSearch === true) {
    input.web_search_options = {
      search_context_size: "medium"
    };
  }

  const result = await env.AI.run(CHAT_MODEL, input);

  return new Response(result, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function handleImage(request, env, user) {
  if (!env.AI || !env.MEDIA || !env.DB) {
    return json({
      error: "image generation requires ai, r2, and d1 bindings"
    }, 503);
  }

  const body = await request.json();

  const prompt = String(body.prompt || "").trim();

  if (!prompt || prompt.length > 2048) {
    return json({
      error: "image prompt must contain 1 to 2048 characters"
    }, 400);
  }

  const result = await env.AI.run(IMAGE_MODEL, {
    prompt,
    steps: 4
  });

  if (!result?.image) {
    throw new Error("image model returned no image");
  }

  const binary = atob(result.image);

  const bytes = Uint8Array.from(
    binary,
    char => char.charCodeAt(0)
  );

  const id = crypto.randomUUID();
  const key = `${user}/${id}.jpg`;

  await env.MEDIA.put(key, bytes, {
    httpMetadata: {
      contentType: "image/jpeg"
    }
  });

  await env.DB.prepare(`
    INSERT INTO media (id, user_id, object_key, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(
    id,
    user,
    key,
    Date.now()
  ).run();

  return json({
    id,
    url: `/api/media/${id}`
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/health") {
        return json({
          status: "online",
          version: "2.0",
          chatModel: CHAT_MODEL,
          imageModel: IMAGE_MODEL,
          ai: Boolean(env.AI),
          database: Boolean(env.DB),
          storage: Boolean(env.MEDIA)
        });
      }

      if (path.startsWith("/api/")) {
        const auth = await requireUser(ctx);

        if (auth.response) return auth.response;

        const user = auth.user;

        if (path === "/api/chat" && request.method === "POST") {
          return await handleChat(request, env);
        }

        if (path === "/api/chats" && request.method === "GET") {
          const result = await env.DB.prepare(`
            SELECT id, title, messages_json, created_at, updated_at
            FROM conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 100
          `).bind(user).all();

          return json({
            chats: result.results.map(row => ({
              id: row.id,
              title: row.title,
              messages: JSON.parse(row.messages_json || "[]"),
              created: row.created_at,
              updated: row.updated_at
            }))
          });
        }

        if (path === "/api/chats" && request.method === "PUT") {
          const body = await request.json();

          const id = String(body.id || "");
          const title = String(body.title || "new chat").slice(0, 200);

          if (!/^[a-zA-Z0-9-]{10,80}$/.test(id)) {
            return json({ error: "invalid chat id" }, 400);
          }

          if (!Array.isArray(body.messages)) {
            return json({ error: "messages must be an array" }, 400);
          }

          const messages = body.messages.slice(-300).map(message => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: String(message.content || "").slice(0, 20000),
            imageUrl: typeof message.imageUrl === "string"
              ? message.imageUrl.slice(0, 500)
              : null
          }));

          const now = Date.now();

          await env.DB.prepare(`
            INSERT INTO conversations
              (id, user_id, title, messages_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              messages_json = excluded.messages_json,
              updated_at = excluded.updated_at
            WHERE conversations.user_id = excluded.user_id
          `).bind(
            id,
            user,
            title,
            JSON.stringify(messages),
            now,
            now
          ).run();

          return json({ saved: true, id });
        }

        if (path.startsWith("/api/chats/") && request.method === "DELETE") {
          const id = path.split("/").pop();

          await env.DB.prepare(`
            DELETE FROM conversations
            WHERE id = ? AND user_id = ?
          `).bind(id, user).run();

          return json({ deleted: true });
        }

        if (path === "/api/memory" && request.method === "GET") {
          const row = await env.DB.prepare(`
            SELECT content FROM memories WHERE user_id = ?
          `).bind(user).first();

          return json({
            memory: row?.content || ""
          });
        }

        if (path === "/api/memory" && request.method === "PUT") {
          const body = await request.json();

          const memory = String(body.memory || "").slice(0, 6000);

          await env.DB.prepare(`
            INSERT INTO memories (user_id, content, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              content = excluded.content,
              updated_at = excluded.updated_at
          `).bind(
            user,
            memory,
            Date.now()
          ).run();

          return json({ saved: true });
        }

        if (path === "/api/image" && request.method === "POST") {
          return await handleImage(request, env, user);
        }

        if (path.startsWith("/api/media/") && request.method === "GET") {
          if (!env.MEDIA || !env.DB) {
            return json({ error: "media storage unavailable" }, 503);
          }

          const id = path.split("/").pop();

          const row = await env.DB.prepare(`
            SELECT object_key
            FROM media
            WHERE id = ? AND user_id = ?
          `).bind(id, user).first();

          if (!row) {
            return json({ error: "image not found" }, 404);
          }

          const object = await env.MEDIA.get(row.object_key);

          if (!object) {
            return json({ error: "image file missing" }, 404);
          }

          return new Response(object.body, {
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "private, max-age=3600"
            }
          });
        }

        return json({ error: "api route not found" }, 404);
      }

      return env.ASSETS.fetch(request);

    } catch (error) {
      return json({
        error: error.message || "server error"
      }, 500);
    }
  }
};
