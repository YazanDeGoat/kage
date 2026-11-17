const $ = id => document.getElementById(id);

const CACHE_KEY = "kage_v2_cache";
const MODE_KEY = "kage_v2_mode";

const LOCAL_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

const SYSTEM_PROMPT = `
you are kage, a personal ai assistant.
communicate naturally and casually.
use lowercase for normal conversational writing.
be helpful, intelligent, accurate, and direct.
preserve capitalization in code and urls.
`;

let chats = [];
let activeChat = null;
let localEngine = null;
let busy = false;
let stopRequested = false;
let abortController = null;
let installPrompt = null;
let attachments = [];

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}

function cache() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(chats));
}

function currentChat() {
  return chats.find(chat => chat.id === activeChat);
}

function plainText(content) {
  if (typeof content === "string") return content;

  if (!Array.isArray(content)) return "";

  return content
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join("\n");
}

function safeImage(url) {
  return typeof url === "string" &&
    /^\/api\/media\/[a-zA-Z0-9-]+$/.test(url);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? {
        "Content-Type": "application/json"
      } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      `server ${response.status}: ${message}`
    );
  }

  return response;
}

function setStatus(value) {
  $("status").textContent = value;
}

function makeId() {
  return crypto.randomUUID();
}

async function loadData() {
  chats = readCache();

  if (chats.length) {
    activeChat = chats[0].id;
    render();
  }

  try {
    const [chatResponse, memoryResponse] = await Promise.all([
      api("/api/chats"),
      api("/api/memory")
    ]);

    const chatData = await chatResponse.json();
    const memoryData = await memoryResponse.json();

    chats = chatData.chats || [];
    activeChat = chats[0]?.id || null;

    localStorage.setItem(
      "kage_memory_cache",
      memoryData.memory || ""
    );

    cache();
    render();

    setStatus("connected and synced");

  } catch (error) {
    setStatus("offline or authentication required");
    console.error(error);
  }
}

async function saveChat(chat) {
  cache();

  try {
    const messages = chat.messages.map(message => ({
      role: message.role,
      content: plainText(message.content),
      imageUrl: safeImage(message.imageUrl)
        ? message.imageUrl
        : null
    }));

    await api("/api/chats", {
      method: "PUT",
      body: JSON.stringify({
        id: chat.id,
        title: chat.title,
        messages
      })
    });

  } catch (error) {
    setStatus("saved locally. sync unavailable");
    console.error(error);
  }
}

async function createChat() {
  const chat = {
    id: makeId(),
    title: "new chat",
    messages: [],
    created: Date.now()
  };

  chats.unshift(chat);
  activeChat = chat.id;

  cache();
  render();

  await saveChat(chat);
}

function render() {
  const chat = currentChat();
  const search = $("searchChats").value.toLowerCase();

  $("chatList").innerHTML = chats
    .filter(item => item.title.toLowerCase().includes(search))
    .map(item => `
      <div class="chat-item ${item.id === activeChat ? "active" : ""}"
           data-id="${item.id}">

        <span class="chat-name">
          ${escapeHTML(item.title)}
        </span>

        <span class="chat-actions">
          <button data-action="rename">✎</button>
          <button data-action="delete">×</button>
        </span>

      </div>
    `).join("");

  const hasMessages = Boolean(chat?.messages.length);

  $("welcome").style.display = hasMessages ? "none" : "flex";

  $("messages").classList.toggle("visible", hasMessages);

  $("messages").innerHTML = chat
    ? chat.messages.map((message, index) => `
      <article class="message">

        <div class="avatar">
          ${message.role === "user" ? "y" : "k"}
        </div>

        <div class="message-body">

          ${escapeHTML(plainText(message.content))}

          ${
            safeImage(message.imageUrl)
              ? `<img src="${message.imageUrl}" alt="generated image">`
              : ""
          }

          <div class="message-tools">

            ${
              message.role === "assistant"
                ? `
                  <button data-action="copy" data-index="${index}">
                    copy
                  </button>

                  <button data-action="regenerate" data-index="${index}">
                    regenerate
                  </button>
                `
                : `
                  <button data-action="edit" data-index="${index}">
                    edit
                  </button>
                `
            }

          </div>

        </div>

      </article>
    `).join("")
    : "";

  $("messages").scrollTop = $("messages").scrollHeight;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function downloadLocalModel() {
  if (localEngine) {
    setStatus("local ai ready");
    return;
  }

  if (!navigator.gpu) {
    setStatus("webgpu unavailable on this device");
    return;
  }

  $("downloadModel").disabled = true;
  setStatus("loading local model");

  try {
    const webllm = await import(
      "https://esm.run/@mlc-ai/web-llm"
    );

    localEngine = await webllm.CreateMLCEngine(
      LOCAL_MODEL,
      {
        initProgressCallback(progress) {
          const percent = Math.round(
            (progress.progress || 0) * 100
          );

          setStatus(
            progress.text || `downloading ${percent}%`
          );
        }
      }
    );

    setStatus("local ai ready");

  } catch (error) {
    localEngine = null;
    setStatus("local model error: " + error.message);

  } finally {
    $("downloadModel").disabled = false;
  }
}

async function streamOnline(messages, memory, onToken) {
  abortController = new AbortController();

  const response = await fetch("/api/chat", {
    method: "POST",

    credentials: "same-origin",

    headers: {
      "Content-Type": "application/json"
    },

    signal: abortController.signal,

    body: JSON.stringify({
      messages,
      memory,
      webSearch: $("webSearch").checked
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  function processEvent(event) {
    for (const line of event.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();

      if (!data || data === "[DONE]") continue;

      const parsed = JSON.parse(data);

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      const token =
        parsed.response ??
        parsed.choices?.[0]?.delta?.content;

      if (typeof token === "string") {
        onToken(token);
      }
    }
  }

  try {
    while (!stopRequested) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, {
        stream: true
      });

      const events = buffer.split(/\r?\n\r?\n/);

      buffer = events.pop() || "";

      for (const event of events) {
        processEvent(event);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      processEvent(buffer);
    }

  } finally {
    reader.releaseLock();
  }
}

async function streamLocal(messages, memory, onToken) {
  if (!localEngine) {
    throw new Error("download local ai first");
  }

  const clean = messages.map(message => ({
    role: message.role,
    content: plainText(message.content)
  }));

  const result = await localEngine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT + "\nuser memory:\n" + memory
      },
      ...clean
    ],

    stream: true,
    temperature: 0.7
  });

  for await (const chunk of result) {
    if (stopRequested) break;

    const token =
      chunk.choices?.[0]?.delta?.content;

    if (token) onToken(token);
  }
}

async function generateReply() {
  if (busy) return;

  const chat = currentChat();

  if (!chat) return;

  busy = true;
  stopRequested = false;

  $("sendButton").textContent = "■";

  const assistant = {
    role: "assistant",
    content: ""
  };

  chat.messages.push(assistant);

  cache();
  render();

  const messages = chat.messages.slice(0, -1).slice(-30);

  const memory =
    localStorage.getItem("kage_memory_cache") || "";

  const onToken = token => {
    assistant.content += token;
    cache();
    render();
  };

  try {
    if ($("modeSelect").value === "local") {
      await streamLocal(messages, memory, onToken);
    } else {
      await streamOnline(messages, memory, onToken);
    }

    if (!assistant.content && !stopRequested) {
      assistant.content = "no response received. try again.";
    }

  } catch (error) {
    if (error.name !== "AbortError") {
      assistant.content = "kage error: " + error.message;
    }

  } finally {
    busy = false;
    abortController = null;

    $("sendButton").textContent = "↑";

    cache();
    render();

    await saveChat(chat);
  }
}

async function sendMessage(text) {
  if (busy) return;

  if (!currentChat()) {
    await createChat();
  }

  const chat = currentChat();

  let content = text;

  if (attachments.length) {
    content = [
      {
        type: "text",
        text
      },
      ...attachments
    ];

    attachments = [];
    $("attachmentPreview").textContent = "";
  }

  chat.messages.push({
    role: "user",
    content
  });

  if (chat.messages.length === 1) {
    chat.title = plainText(content).slice(0, 32) || "new chat";
  }

  cache();
  render();

  await generateReply();
}

$("chatForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (busy) {
    stopRequested = true;
    abortController?.abort();
    return;
  }

  const input = $("messageInput");
  const text = input.value.trim();

  if (!text && !attachments.length) return;

  input.value = "";
  input.style.height = "auto";

  await sendMessage(text);
});

$("messageInput").addEventListener("input", event => {
  event.target.style.height = "auto";

  event.target.style.height =
    Math.min(event.target.scrollHeight, 150) + "px";
});

$("downloadModel").addEventListener(
  "click",
  downloadLocalModel
);

$("modeSelect").addEventListener("change", event => {
  localStorage.setItem(MODE_KEY, event.target.value);

  setStatus(
    event.target.value === "local"
      ? "local ai selected"
      : "online ai selected"
  );
});

$("newChat").addEventListener("click", createChat);

$("searchChats").addEventListener("input", render);

$("menuButton").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("closeSidebar").addEventListener("click", () => {
  $("sidebar").classList.remove("open");
});

$("chatList").addEventListener("click", async event => {
  const item = event.target.closest(".chat-item");

  if (!item) return;

  const chat = chats.find(
    entry => entry.id === item.dataset.id
  );

  if (!chat) return;

  const action = event.target.dataset.action;

  if (action === "rename") {
    const name = prompt("rename chat:", chat.title);

    if (name?.trim()) {
      chat.title = name.trim();

      cache();
      render();

      await saveChat(chat);
    }

    return;
  }

  if (action === "delete") {
    chats = chats.filter(
      entry => entry.id !== item.dataset.id
    );

    try {
      await api(`/api/chats/${item.dataset.id}`, {
        method: "DELETE"
      });
    } catch (error) {
      console.error(error);
    }

    activeChat = chats[0]?.id || null;

    cache();
    render();

    return;
  }

  activeChat = chat.id;

  $("sidebar").classList.remove("open");

  render();
});

$("messages").addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const chat = currentChat();

  if (!chat) return;

  const index = Number(button.dataset.index);
  const message = chat.messages[index];

  if (!message) return;

  const action = button.dataset.action;

  if (action === "copy") {
    await navigator.clipboard.writeText(
      plainText(message.content)
    );

    setStatus("copied");
  }

  if (action === "edit") {
    const replacement = prompt(
      "edit message:",
      plainText(message.content)
    );

    if (!replacement?.trim()) return;

    chat.messages = chat.messages.slice(0, index);

    cache();
    render();

    await sendMessage(replacement);
  }

  if (action === "regenerate") {
    if (message.role !== "assistant") return;

    chat.messages = chat.messages.slice(0, index);

    cache();
    render();

    await generateReply();
  }
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

$("attachButton").addEventListener("click", () => {
  $("fileInput").click();
});

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

$("fileInput").addEventListener("change", async event => {
  for (const file of Array.from(event.target.files)) {
    if (file.size > 5 * 1024 * 1024) {
      alert("each file must be smaller than 5 mb");
      continue;
    }

    if (file.type.startsWith("image/")) {
      attachments.push({
        type: "image_url",
        image_url: {
          url: await toBase64(file)
        }
      });

    } else if (file.type === "application/pdf") {
      attachments.push({
        type: "file",
        file_data: await toBase64(file),
        filename: file.name
      });

    } else {
      attachments.push({
        type: "text",
        text:
          `file: ${file.name}\n` +
          (await file.text()).slice(0, 20000)
      });
    }
  }

  $("attachmentPreview").textContent =
    `${attachments.length} attachment(s) ready`;

  event.target.value = "";
});

$("imageButton").addEventListener("click", async () => {
  const prompt = window.prompt("describe the image:");

  if (!prompt?.trim()) return;

  setStatus("generating image");

  try {
    const response = await api("/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt })
    });

    const result = await response.json();

    const chat = currentChat();

    if (!chat) await createChat();

    const active = currentChat();

    active.messages.push({
      role: "assistant",
      content: "generated image",
      imageUrl: result.url
    });

    cache();
    render();

    await saveChat(active);

    setStatus("image generated");

  } catch (error) {
    setStatus("image error: " + error.message);
  }
});

$("voiceButton").addEventListener("click", () => {
  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!Recognition) {
    setStatus("voice input unavailable");
    return;
  }

  const recognition = new Recognition();

  recognition.lang = "en-US";

  recognition.onresult = event => {
    $("messageInput").value +=
      event.results[0][0].transcript;
  };

  recognition.start();
});

$("memoryButton").addEventListener("click", async () => {
  try {
    const response = await api("/api/memory");
    const data = await response.json();

    $("memoryInput").value = data.memory || "";

  } catch {
    $("memoryInput").value =
      localStorage.getItem("kage_memory_cache") || "";
  }

  $("memoryDialog").showModal();
});

$("saveMemory").addEventListener("click", async () => {
  const memory = $("memoryInput").value;

  localStorage.setItem("kage_memory_cache", memory);

  try {
    await api("/api/memory", {
      method: "PUT",
      body: JSON.stringify({ memory })
    });

    setStatus("memory synced");

  } catch {
    setStatus("memory saved on this device");
  }

  $("memoryDialog").close();
});

$("settingsButton").addEventListener("click", () => {
  $("settingsDialog").showModal();
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    $(button.dataset.close).close();
  });
});

$("exportChats").addEventListener("click", () => {
  const blob = new Blob(
    [JSON.stringify(chats, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "kage-backup.json";

  link.click();

  URL.revokeObjectURL(url);
});

$("deleteAll").addEventListener("click", async () => {
  if (!confirm("delete all conversations?")) return;

  for (const chat of [...chats]) {
    try {
      await api(`/api/chats/${chat.id}`, {
        method: "DELETE"
      });
    } catch {
      // continue deleting the remaining chats
    }
  }

  chats = [];
  activeChat = null;

  cache();
  render();

  $("settingsDialog").close();
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
});

$("installButton").addEventListener("click", async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    return;
  }

  alert(
    "open your browser menu and choose install app or add to home screen. on iphone and ipad, use safari's share menu."
  );
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(console.error);
}

$("modeSelect").value =
  localStorage.getItem(MODE_KEY) || "online";

loadData();
