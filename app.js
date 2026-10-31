"use strict";

/*
 * KAGE HYBRID AI
 *
 * ONLINE:
 *   Uses the existing Kage Cloudflare Worker API.
 *
 * LOCAL:
 *   Runs a downloadable language model in the browser.
 *   Saves local conversations on the device.
 *
 * Local model downloads require internet on first use.
 * Offline operation depends on the model and app files being cached.
 */

const $ = (id) => document.getElementById(id);

const STORAGE = {
  url: "kage_api_url",
  key: "kage_access_key",
  cache: "kage_local_cache_v2",
  mode: "kage_ai_mode_v1",
  localChats: "kage_local_chats_v1"
};

let apiBase = localStorage.getItem(STORAGE.url) || "";
let accessKey = localStorage.getItem(STORAGE.key) || "";

let currentChatId = null;
let currentMessages = [];
let attachedText = "";
let showingDeleted = false;
let searchMode = false;
let imageMode = false;
let busy = false;

let aiMode = localStorage.getItem(STORAGE.mode) || "online";

let localModel = null;
let localModelPromise = null;
let localModelReady = false;

const LOCAL_MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showError(error) {
  alert(error?.message || "Something went wrong.");
}

function setBusy(value) {
  busy = value;

  if ($("sendButton")) {
    $("sendButton").disabled = value;
    $("sendButton").textContent = value ? "…" : "↑";
  }

  if ($("localModeButton")) {
    $("localModeButton").disabled = value;
  }

  if ($("onlineModeButton")) {
    $("onlineModeButton").disabled = value;
  }
}

function titleFrom(text) {
  const words = String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 3);

  return words.join(" ") || "new chat";
}

function updateModes() {
  if ($("searchButton")) {
    $("searchButton").classList.toggle("mode-active", searchMode);
    $("searchButton").setAttribute("aria-pressed", String(searchMode));
  }

  if ($("imageButton")) {
    $("imageButton").classList.toggle("mode-active", imageMode);
    $("imageButton").setAttribute("aria-pressed", String(imageMode));
  }

  updateModeBar();
}

function updateModeBar() {
  const status = $("kageModeStatus");
  const onlineButton = $("onlineModeButton");
  const localButton = $("localModeButton");

  if (onlineButton) {
    onlineButton.classList.toggle("mode-active", aiMode === "online");
    onlineButton.setAttribute("aria-pressed", String(aiMode === "online"));
  }

  if (localButton) {
    localButton.classList.toggle("mode-active", aiMode === "local");
    localButton.setAttribute("aria-pressed", String(aiMode === "local"));
  }

  if (status) {
    if (aiMode === "online") {
      status.textContent = "online AI";
    } else if (localModelReady) {
      status.textContent = "local AI ready";
    } else {
      status.textContent = "local AI · model not loaded";
    }
  }

  const title = document.querySelector(".top-title");

  if (title) {
    title.innerHTML = `
      Kage
      <span class="online-dot"
        style="background:${aiMode === "online" ? "#8ac6a1" : "#8ab4f8"}">
      </span>
      <span style="font-size:11px;color:#aaa">
        ${aiMode === "online" ? "ONLINE" : "LOCAL"}
      </span>
    `;
  }
}

function installModeBar() {
  if ($("kageModeBar")) return;

  const bar = document.createElement("div");
  bar.id = "kageModeBar";

  bar.style.cssText = [
    "display:flex",
    "align-items:center",
    "gap:8px",
    "padding:10px 16px",
    "border-bottom:1px solid #292929",
    "background:#111",
    "flex-wrap:wrap"
  ].join(";");

  bar.innerHTML = `
    <span style="color:#999;font-size:12px">AI mode</span>

    <button type="button" id="onlineModeButton"
      class="tool-button">online</button>

    <button type="button" id="localModeButton"
      class="tool-button">local AI</button>

    <span id="kageModeStatus"
      style="font-size:12px;color:#999;margin-left:auto">
    </span>
  `;

  const topbar = document.querySelector(".topbar");

  if (topbar) {
    topbar.insertAdjacentElement("afterend", bar);
  }

  $("onlineModeButton").addEventListener("click", () => {
    switchMode("online");
  });

  $("localModeButton").addEventListener("click", async () => {
    switchMode("local");
  });

  updateModeBar();
}

async function api(path, options = {}) {
  if (!apiBase) {
    throw new Error("Add your Kage backend URL in Settings.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (accessKey) {
    headers.set("Authorization", `Bearer ${accessKey}`);
  }

  let response;

  try {
    response = await fetch(
      apiBase.replace(/\/+$/, "") + path,
      {
        ...options,
        headers
      }
    );
  } catch {
    throw new Error(
      "Kage couldn't reach its online backend. Check your connection."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed (${response.status}).`
    );
  }

  return data;
}

/* -------------------------------------------------------
   LOCAL CONVERSATIONS
------------------------------------------------------- */

function getLocalChats() {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE.localChats) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLocalChats(chats) {
  try {
    localStorage.setItem(
      STORAGE.localChats,
      JSON.stringify(chats)
    );
  } catch {
    throw new Error(
      "Kage couldn't save this conversation. Export your chats and free up browser storage."
    );
  }
}

function saveLocalConversation() {
  if (!currentChatId) return;

  const chats = getLocalChats();
  const index = chats.findIndex(
    (chat) => chat.id === currentChatId
  );

  if (index < 0) return;

  chats[index].messages = currentMessages;
  chats[index].updatedAt = Date.now();

  saveLocalChats(chats);
  saveLocalCache();
  renderLocalChatList();
}

function createLocalConversation(firstMessage = "") {
  const chat = {
    id: makeId(),
    title: titleFrom(firstMessage),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  };

  const chats = getLocalChats();
  chats.unshift(chat);
  saveLocalChats(chats);

  currentChatId = chat.id;
  currentMessages = [];

  renderLocalChatList();

  return chat;
}

function renderLocalChatList() {
  const list = $("chatList");
  if (!list) return;

  const chats = getLocalChats().sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  if (!chats.length) {
    list.innerHTML =
      '<div class="empty-note">no local chats yet.</div>';
    return;
  }

  list.innerHTML = chats.map((chat) => `
    <div class="chat-item ${
      chat.id === currentChatId ? "active" : ""
    }">
      <button class="chat-select"
        data-local-open="${escapeHTML(chat.id)}">
        ${escapeHTML(chat.title || "new chat")}
      </button>

      <button class="chat-action"
        data-local-rename="${escapeHTML(chat.id)}"
        title="Rename chat">✎</button>

      <button class="chat-action"
        data-local-delete="${escapeHTML(chat.id)}"
        title="Delete chat">×</button>
    </div>
  `).join("");
}

function openLocalConversation(id) {
  const chat = getLocalChats().find(
    (item) => item.id === id
  );

  if (!chat) return;

  currentChatId = chat.id;
  currentMessages = Array.isArray(chat.messages)
    ? chat.messages
    : [];

  renderMessages();
  saveLocalCache();
  renderLocalChatList();

  if (window.innerWidth <= 650) {
    $("sidebar").classList.remove("open");
  }
}

function newLocalConversation() {
  currentChatId = null;
  currentMessages = [];
  attachedText = "";

  $("prompt").value = "";
  $("attachmentName").textContent = "";
  $("messageList").innerHTML = "";
  $("welcome").hidden = false;

  saveLocalCache();
  renderLocalChatList();
  $("prompt").focus();
}

function renameLocalConversation(id) {
  const chats = getLocalChats();
  const chat = chats.find((item) => item.id === id);

  if (!chat) return;

  const title = prompt("rename chat:", chat.title);

  if (title === null || !title.trim()) return;

  chat.title = title.trim();

  saveLocalChats(chats);
  renderLocalChatList();
}

function deleteLocalConversation(id) {
  if (!confirm("delete this local chat?")) return;

  saveLocalChats(
    getLocalChats().filter((chat) => chat.id !== id)
  );

  if (currentChatId === id) {
    newLocalConversation();
  }

  renderLocalChatList();
}

/* -------------------------------------------------------
   LOCAL MODEL
------------------------------------------------------- */

async function loadLocalModel() {
  if (localModel) return localModel;
  if (localModelPromise) return localModelPromise;

  localModelPromise = (async () => {
    updateLocalStatus("loading AI library...");

    const transformers = await import(
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2"
    );

    updateLocalStatus("downloading local model...");

    const options = {
      dtype: "q4"
    };

    if (navigator.gpu) {
      options.device = "webgpu";
    } else {
      options.device = "wasm";
    }

    localModel = await transformers.pipeline(
      "text-generation",
      LOCAL_MODEL,
      options
    );

    localModelReady = true;
    updateLocalStatus(
      navigator.gpu
        ? "local model ready · WebGPU"
        : "local model ready · WASM"
    );

    updateModeBar();

    return localModel;
  })();

  try {
    return await localModelPromise;
  } catch (error) {
    localModelPromise = null;
    localModel = null;
    localModelReady = false;

    updateLocalStatus("model failed to load");
    updateModeBar();

    throw new Error(
      "Kage couldn't download or start the local AI model. " +
      "Check your internet connection, browser compatibility, and available device memory. " +
      (error?.message || "")
    );
  }
}

function updateLocalStatus(message) {
  const status = $("kageModeStatus");

  if (status) {
    status.textContent = message;
  }
}

async function generateLocalReply() {
  const model = await loadLocalModel();

  const history = currentMessages
    .filter((message) =>
      message.role === "user" ||
      message.role === "assistant"
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: String(message.content || "")
    }));

  const messages = [
    {
      role: "system",
      content:
        "You are Kage, a helpful AI assistant. " +
        "Be natural, direct, accurate, and useful. " +
        "Use a casual lowercase style when it fits. " +
        "Never pretend to have searched the internet. " +
        "If you are unsure, explain the uncertainty."
    },
    ...history
  ];

  const result = await model(messages, {
    max_new_tokens: 384,
    do_sample: true,
    temperature: 0.7,
    top_p: 0.9,
    repetition_penalty: 1.08
  });

  const generated = result?.[0]?.generated_text;

  let answer = "";

  if (Array.isArray(generated)) {
    answer = generated[generated.length - 1]?.content || "";
  } else if (typeof generated === "string") {
    answer = generated;
  }

  answer = String(answer).trim();

  if (!answer) {
    throw new Error("The local model returned an empty response.");
  }

  return answer;
}

/* -------------------------------------------------------
   SEARCH
------------------------------------------------------- */

async function performSearch(query) {
  const data = await api(
    `/api/search?q=${encodeURIComponent(query)}`
  );

  return data.results || [];
}

async function searchForLocalReply(query) {
  if (!apiBase || !accessKey) {
    throw new Error(
      "Live search requires your online Kage backend. Local chatting still works without it."
    );
  }

  return performSearch(query);
}

/* -------------------------------------------------------
   ONLINE CHAT AND IMAGE GENERATION
------------------------------------------------------- */

async function ensureOnlineChat(firstMessage) {
  if (currentChatId) return currentChatId;

  const data = await api("/api/chats", {
    method: "POST",
    body: JSON.stringify({
      title: titleFrom(firstMessage)
    })
  });

  currentChatId = data.chat.id;

  return currentChatId;
}

async function generateImage(promptText) {
  const imageWindow = window.open("about:blank", "_blank");

  try {
    const data = await api("/api/image", {
      method: "POST",
      body: JSON.stringify({
        prompt: promptText
      })
    });

    if (!data.dataURI) {
      throw new Error("The image model returned no image.");
    }

    if (!imageWindow) {
      const link = document.createElement("a");
      link.href = data.dataURI;
      link.download = "kage-generated-image.jpg";
      link.click();
      return;
    }

    const image = document.createElement("img");
    image.src = data.dataURI;
    image.alt = "Image generated by Kage";
    image.style.cssText =
      "display:block;max-width:96vw;max-height:85vh;margin:20px auto";

    imageWindow.document.body.style.cssText =
      "margin:0;background:#111;color:#eee;font:16px system-ui;text-align:center";

    imageWindow.document.title = "Kage generated image";
    imageWindow.document.body.replaceChildren();

    const heading = imageWindow.document.createElement("h2");
    heading.textContent = "Kage generated image";

    const save = imageWindow.document.createElement("a");
    save.textContent = "Save image";
    save.href = data.dataURI;
    save.download = "kage-generated-image.jpg";
    save.style.color = "white";

    imageWindow.document.body.append(heading, image, save);
  } catch (error) {
    if (imageWindow && !imageWindow.closed) {
      imageWindow.close();
    }

    throw error;
  }
}

/* -------------------------------------------------------
   MESSAGE SENDING
------------------------------------------------------- */

async function sendMessage(rawText, options = {}) {
  if (busy) return;

  const text = String(rawText || "").trim();

  if (!text && !options.regenerate && !attachedText) {
    return;
  }

  if (text.length > 12000) {
    alert("Keep messages under 12,000 characters.");
    return;
  }

  setBusy(true);

  try {
    if (aiMode === "local") {
      await sendLocalMessage(text, options);
    } else {
      await sendOnlineMessage(text, options);
    }
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
    $("prompt").focus();
    updateModeBar();
  }
}

async function sendLocalMessage(text, options = {}) {
  if (imageMode && !options.regenerate) {
    throw new Error(
      "Local image generation is not included in this text model. Switch to online mode to use Kage's configured image service."
    );
  }

  if (!options.regenerate) {
    let userText = text;

    if (attachedText) {
      userText += `\n\nAttached file contents:\n${attachedText}`;
    }

    if (!currentChatId) {
      createLocalConversation(userText || "new chat");
    }

    if (searchMode && text) {
      try {
        updateLocalStatus("searching online...");

        const results = await searchForLocalReply(text);

        if (results.length) {
          const context = results.map((item, index) =>
            `${index + 1}. ${item.title}\n${item.snippet}\n${item.url}`
          ).join("\n\n");

          userText += "\n\nSearch results:\n" + context;
        } else {
          userText +=
            "\n\nNo search results were returned. Be transparent about uncertainty.";
        }
      } catch (error) {
        userText +=
          "\n\nLive search was unavailable. Do not claim this information was verified online.";
      }
    }

    currentMessages.push({
      id: makeId(),
      role: "user",
      content: userText,
      created_at: new Date().toISOString()
    });

    $("prompt").value = "";
    $("attachmentName").textContent = "";
    attachedText = "";
  } else {
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === "assistant") {
        currentMessages.splice(i, 1);
        break;
      }
    }
  }

  renderMessages();
  saveLocalConversation();

  updateLocalStatus("thinking locally...");

  const answer = await generateLocalReply();

  currentMessages.push({
    id: makeId(),
    role: "assistant",
    content: answer,
    created_at: new Date().toISOString()
  });

  renderMessages();
  saveLocalConversation();

  searchMode = false;
  imageMode = false;
  updateModes();
}

async function sendOnlineMessage(text, options = {}) {
  if (!apiBase || !accessKey) {
    $("apiUrl").value = apiBase;
    $("accessKey").value = accessKey;
    $("settingsDialog").showModal();

    throw new Error(
      "Enter your backend URL and private access key in Settings."
    );
  }

  if (imageMode && !options.regenerate) {
    await generateImage(text);

    imageMode = false;
    searchMode = false;
    updateModes();

    return;
  }

  const firstUserMessage = currentMessages.find(
    (item) => item.role === "user"
  );

  await ensureOnlineChat(
    firstUserMessage?.content || text || "new chat"
  );

  if (!options.regenerate) {
    let userText = text;

    if (attachedText) {
      userText += `\n\nAttached file contents:\n${attachedText}`;
    }

    if (searchMode && text) {
      const results = await performSearch(text);

      if (results.length) {
        const context = results.map((item, index) =>
          `${index + 1}. ${item.title}\n${item.snippet}\n${item.url}`
        ).join("\n\n");

        userText += "\n\nReference search results:\n" + context;
      } else {
        userText +=
          "\n\nNo search results were returned. Be transparent about uncertainty.";
      }
    }

    currentMessages.push({
      role: "user",
      content: userText
    });

    renderMessages();
    saveLocalCache();

    $("prompt").value = "";
    $("attachmentName").textContent = "";
    attachedText = "";
  }

  const latestUserMessage = [...currentMessages]
    .reverse()
    .find((item) => item.role === "user");

  const data = await api("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      chatId: currentChatId,
      regenerate: Boolean(options.regenerate),
      message: options.regenerate
        ? ""
        : latestUserMessage?.content
    })
  });

  currentMessages = data.messages || currentMessages;

  renderMessages();
  saveLocalCache();

  searchMode = false;
  updateModes();

  await loadChats();
}

/* -------------------------------------------------------
   MESSAGE RENDERING AND LOCAL CACHE
------------------------------------------------------- */

function saveLocalCache() {
  try {
    localStorage.setItem(STORAGE.cache, JSON.stringify({
      currentChatId,
      currentMessages,
      savedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn("Kage couldn't save its local cache.", error);
  }
}

function loadLocalCache() {
  try {
    const data = JSON.parse(
      localStorage.getItem(STORAGE.cache) || "{}"
    );

    currentChatId = data.currentChatId || null;

    currentMessages = Array.isArray(data.currentMessages)
      ? data.currentMessages
      : [];

    renderMessages();
  } catch {
    currentChatId = null;
    currentMessages = [];
  }
}

function renderMessages() {
  $("welcome").hidden = currentMessages.length > 0;

  $("messageList").innerHTML = currentMessages.map(
    (message, index) => {
      const role = message.role === "user"
        ? "user"
        : "assistant";

      return `
        <article class="message ${role}">
          <div class="message-role">
            ${role === "user" ? "you" : "kage"}
          </div>

          <div class="message-content">${
            escapeHTML(message.content || "")
          }</div>

          <div class="message-actions">
            <button data-copy="${index}">Copy</button>

            ${
              role === "user"
                ? `<button data-edit="${index}">Edit & resend</button>`
                : `<button data-regenerate="${index}">Regenerate</button>`
            }

            <button data-delete-message="${index}">Delete</button>
          </div>
        </article>
      `;
    }
  ).join("");

  $("messages").scrollTop = $("messages").scrollHeight;
}

/* -------------------------------------------------------
   ONLINE CHAT LIST
------------------------------------------------------- */

async function loadChats() {
  if (aiMode === "local") {
    renderLocalChatList();
    return;
  }

  if (!apiBase || !accessKey) {
    $("chatList").innerHTML =
      '<div class="empty-note">Connect Kage in Settings to load saved chats.</div>';
    return;
  }

  try {
    const data = await api(
      "/api/chats" + (showingDeleted ? "?deleted=1" : "")
    );

    renderOnlineChatList(data.chats || []);
  } catch (error) {
    $("chatList").innerHTML =
      `<div class="empty-note">${escapeHTML(error.message)}</div>`;
  }
}

function renderOnlineChatList(chats) {
  if (!chats.length) {
    $("chatList").innerHTML =
      '<div class="empty-note">No chats here yet.</div>';
    return;
  }

  $("chatList").innerHTML = chats.map((chat) => `
    <div class="chat-item ${
      chat.id === currentChatId ? "active" : ""
    }">
      <button class="chat-select"
        data-open="${escapeHTML(chat.id)}">
        ${escapeHTML(chat.title || "new chat")}
      </button>

      ${
        showingDeleted
          ? `<button class="chat-action"
              data-restore="${escapeHTML(chat.id)}">↶</button>`
          : `
            <button class="chat-action"
              data-rename="${escapeHTML(chat.id)}">✎</button>

            <button class="chat-action"
              data-delete="${escapeHTML(chat.id)}">×</button>
          `
      }
    </div>
  `).join("");
}

async function openChat(id) {
  if (aiMode === "local") {
    openLocalConversation(id);
    return;
  }

  try {
    const data = await api(
      `/api/chats/${encodeURIComponent(id)}`
    );

    currentChatId = id;
    currentMessages = data.messages || [];

    renderMessages();
    saveLocalCache();

    await loadChats();

    if (window.innerWidth <= 650) {
      $("sidebar").classList.remove("open");
    }
  } catch (error) {
    showError(error);
  }
}

function newChat() {
  if (aiMode === "local") {
    newLocalConversation();
    return;
  }

  currentChatId = null;
  currentMessages = [];
  attachedText = "";

  $("prompt").value = "";
  $("attachmentName").textContent = "";
  $("messageList").innerHTML = "";
  $("welcome").hidden = false;

  saveLocalCache();

  $("prompt").focus();
  loadChats();
}

/* -------------------------------------------------------
   MODE SWITCHING
------------------------------------------------------- */

function switchMode(nextMode) {
  aiMode = nextMode;
  localStorage.setItem(STORAGE.mode, aiMode);

  currentChatId = null;
  currentMessages = [];
  attachedText = "";

  $("prompt").value = "";
  $("attachmentName").textContent = "";
  $("messageList").innerHTML = "";
  $("welcome").hidden = false;

  searchMode = false;
  imageMode = false;

  updateModes();
  updateModeBar();
  saveLocalCache();

  if (aiMode === "local") {
    renderLocalChatList();
  } else {
    loadChats();
  }
}

/* -------------------------------------------------------
   EVENT HANDLERS
------------------------------------------------------- */

$("composer").addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage($("prompt").value);
});

$("prompt").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("composer").requestSubmit();
  }
});

$("prompt").addEventListener("input", () => {
  $("prompt").style.height = "auto";

  $("prompt").style.height =
    Math.min($("prompt").scrollHeight, 180) + "px";
});

$("newChat").addEventListener("click", newChat);

$("menuButton").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("settingsButton").addEventListener("click", () => {
  $("apiUrl").value = apiBase;
  $("accessKey").value = accessKey;
  $("settingsDialog").showModal();
});

$("saveSettings").addEventListener("click", async () => {
  apiBase = $("apiUrl").value.trim().replace(/\/+$/, "");
  accessKey = $("accessKey").value.trim();

  localStorage.setItem(STORAGE.url, apiBase);
  localStorage.setItem(STORAGE.key, accessKey);

  $("settingsDialog").close();

  if (aiMode === "online") {
    await loadChats();
  }
});

$("clearLocalCache").addEventListener("click", () => {
  if (!confirm(
    "Clear this browser's current chat cache? Saved server chats and separately stored local chats will remain."
  )) {
    return;
  }

  localStorage.removeItem(STORAGE.cache);

  currentChatId = null;
  currentMessages = [];

  renderMessages();
  $("welcome").hidden = false;
});

$("deletedButton").addEventListener("click", async () => {
  if (aiMode === "local") {
    alert("Recently deleted is currently available only for online chats.");
    return;
  }

  showingDeleted = !showingDeleted;

  $("deletedButton").textContent = showingDeleted
    ? "← Back to chats"
    : "Recently deleted";

  await loadChats();
});

$("searchButton").addEventListener("click", () => {
  searchMode = !searchMode;

  if (searchMode) imageMode = false;

  updateModes();
});

$("imageButton").addEventListener("click", () => {
  imageMode = !imageMode;

  if (imageMode) searchMode = false;

  updateModes();
});

$("chatList").addEventListener("click", async (event) => {
  const localOpen = event.target.closest("[data-local-open]");
  const localRename = event.target.closest("[data-local-rename]");
  const localDelete = event.target.closest("[data-local-delete]");

  if (aiMode === "local") {
    if (localOpen) {
      openLocalConversation(localOpen.dataset.localOpen);
    } else if (localRename) {
      renameLocalConversation(localRename.dataset.localRename);
    } else if (localDelete) {
      deleteLocalConversation(localDelete.dataset.localDelete);
    }

    return;
  }

  const open = event.target.closest("[data-open]");
  const rename = event.target.closest("[data-rename]");
  const remove = event.target.closest("[data-delete]");
  const restore = event.target.closest("[data-restore]");

  try {
    if (open) {
      await openChat(open.dataset.open);
      return;
    }

    if (rename) {
      const id = rename.dataset.rename;
      const existing = rename.parentElement
        .querySelector(".chat-select")
        .textContent.trim();

      const title = prompt("New chat name:", existing);

      if (title === null || !title.trim()) return;

      await api(`/api/chats/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim()
        })
      });

      await loadChats();
      return;
    }

    if (remove) {
      const id = remove.dataset.delete;

      if (!confirm("Move this chat to Recently deleted?")) {
        return;
      }

      await api(`/api/chats/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      if (currentChatId === id) newChat();

      await loadChats();
      return;
    }

    if (restore) {
      await api(
        `/api/chats/${encodeURIComponent(restore.dataset.restore)}/restore`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );

      await loadChats();
    }
  } catch (error) {
    showError(error);
  }
});

$("messageList").addEventListener("click", async (event) => {
  const copy = event.target.closest("[data-copy]");
  const edit = event.target.closest("[data-edit]");
  const regenerate = event.target.closest("[data-regenerate]");
  const remove = event.target.closest("[data-delete-message]");

  try {
    if (copy) {
      const item = currentMessages[Number(copy.dataset.copy)];

      await navigator.clipboard.writeText(item.content || "");

      copy.textContent = "Copied!";

      setTimeout(() => {
        copy.textContent = "Copy";
      }, 1000);

      return;
    }

    if (aiMode === "local") {
      if (edit) {
        const index = Number(edit.dataset.edit);
        const original = currentMessages[index];

        const edited = prompt(
          "Edit your message:",
          original.content
        );

        if (edited === null || !edited.trim()) return;

        currentMessages = currentMessages.slice(0, index);

        currentMessages.push({
          id: makeId(),
          role: "user",
          content: edited.trim(),
          created_at: new Date().toISOString()
        });

        saveLocalConversation();
        renderMessages();

        await sendMessage("", { regenerate: true });
        return;
      }

      if (regenerate) {
        await sendMessage("", { regenerate: true });
        return;
      }

      if (remove) {
        const index = Number(remove.dataset.deleteMessage);

        if (!confirm(
          "Delete this message and everything after it?"
        )) {
          return;
        }

        currentMessages = currentMessages.slice(0, index);

        saveLocalConversation();
        renderMessages();
      }

      return;
    }

    if (edit) {
      const index = Number(edit.dataset.edit);
      const original = currentMessages[index];

      const edited = prompt(
        "Edit your message:",
        original.content
      );

      if (edited === null || !edited.trim()) return;

      await api(
        `/api/chats/${encodeURIComponent(currentChatId)}/messages/${encodeURIComponent(original.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            content: edited.trim()
          })
        }
      );

      const data = await api(
        `/api/chats/${encodeURIComponent(currentChatId)}`
      );

      currentMessages = data.messages || [];

      renderMessages();
      saveLocalCache();

      await sendMessage("", { regenerate: true });
      return;
    }

    if (regenerate) {
      await sendMessage("", { regenerate: true });
      return;
    }

    if (remove) {
      const index = Number(remove.dataset.deleteMessage);
      const message = currentMessages[index];

      if (!confirm(
        "Delete this message and everything after it?"
      )) {
        return;
      }

      await api(
        `/api/chats/${encodeURIComponent(currentChatId)}/messages/${encodeURIComponent(message.id)}`,
        {
          method: "DELETE"
        }
      );

      const data = await api(
        `/api/chats/${encodeURIComponent(currentChatId)}`
      );

      currentMessages = data.messages || [];

      renderMessages();
      saveLocalCache();
    }
  } catch (error) {
    showError(error);
  }
});

$("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  if (file.size > 100_000) {
    alert("Text attachments must be under 100 KB.");
    event.target.value = "";
    return;
  }

  try {
    attachedText = await file.text();
    $("attachmentName").textContent = file.name;
  } catch {
    alert("Couldn't read that file.");
  }

  event.target.value = "";
});

$("voiceButton").addEventListener("click", () => {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice input isn't supported by this browser.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    $("prompt").value +=
      ($("prompt").value ? " " : "") +
      event.results[0][0].transcript;

    $("prompt").dispatchEvent(new Event("input"));
  };

  recognition.onerror = () => {
    alert("Voice input failed. Check microphone permissions.");
  };

  recognition.start();
});

$("exportButton").addEventListener("click", async () => {
  try {
    let chats;

    if (aiMode === "local") {
      chats = getLocalChats();
    } else {
      const data = await api("/api/chats?export=1");
      chats = data.chats || [];
    }

    const blob = new Blob(
      [JSON.stringify(chats, null, 2)],
      { type: "application/json" }
    );

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = aiMode === "local"
      ? "kage-local-chats-backup.json"
      : "kage-chats-backup.json";

    link.click();

    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    showError(error);
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    $("prompt").value = button.dataset.prompt;
    $("prompt").dispatchEvent(new Event("input"));
    $("prompt").focus();
  });
});

/* -------------------------------------------------------
   STARTUP
------------------------------------------------------- */

installModeBar();
loadLocalCache();
updateModes();

if (aiMode === "local") {
  renderLocalChatList();
} else {
  loadChats();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Kage service worker registration failed.", error);
    });
  });
}
