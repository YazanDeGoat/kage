"use strict";

/*
 * KAGE LOCAL AI
 * Browser-based local inference with Transformers.js.
 *
 * First launch requires internet to download the AI library and model.
 * After the model is cached, offline use may work if the browser retains
 * the cached files and the app shell is available.
 */

(() => {
  const MODE_KEY = "kage_ai_mode_v1";
  const CHATS_KEY = "kage_local_chats_v1";

  const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
  const MAX_HISTORY = 12;

  let mode = localStorage.getItem(MODE_KEY) || "online";
  let generator = null;
  let modelPromise = null;
  let modelReady = false;
  let localBusy = false;

  const original = {
    sendMessage: window.sendMessage,
    loadChats: window.loadChats,
    openChat: window.openChat,
    newChat: window.newChat
  };

  const $ = (id) => document.getElementById(id);

  function getLocalChats() {
    try {
      const value = JSON.parse(localStorage.getItem(CHATS_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveLocalChats(chats) {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch {
      throw new Error(
        "Kage couldn't save these chats. Your browser may be out of storage."
      );
    }
  }

  function makeId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function shortTitle(text) {
    const ignored = new Set([
      "the", "and", "for", "that", "this", "with", "what",
      "how", "can", "you", "your", "are", "was", "have",
      "help", "please", "tell", "about", "make", "give"
    ]);

    const words = String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .filter((word) => word && !ignored.has(word))
      .slice(0, 3);

    return words.length ? words.join(" ") : "new chat";
  }

  function getCurrentLocalChat() {
    if (!currentChatId) return null;
    return getLocalChats().find((chat) => chat.id === currentChatId) || null;
  }

  function saveCurrentLocalChat() {
    if (!currentChatId) return;

    const chats = getLocalChats();
    const index = chats.findIndex((chat) => chat.id === currentChatId);

    if (index === -1) return;

    chats[index].messages = currentMessages;
    chats[index].updatedAt = Date.now();

    saveLocalChats(chats);
    renderLocalChats();
    saveLocalCache();
  }

  function createLocalChat(firstMessage) {
    const chat = {
      id: makeId(),
      title: shortTitle(firstMessage),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };

    const chats = getLocalChats();
    chats.unshift(chat);
    saveLocalChats(chats);

    currentChatId = chat.id;
    currentMessages = [];

    renderLocalChats();
    return chat;
  }

  function renderLocalChats() {
    const list = $("chatList");
    if (!list) return;

    const chats = getLocalChats();

    if (!chats.length) {
      list.innerHTML =
        '<div class="empty-note">no local chats yet.</div>';
      return;
    }

    list.innerHTML = chats
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((chat) => `
        <div class="chat-item ${chat.id === currentChatId ? "active" : ""}">
          <button class="chat-select" data-local-open="${escapeHTML(chat.id)}">
            ${escapeHTML(chat.title)}
          </button>
          <button class="chat-action"
            data-local-rename="${escapeHTML(chat.id)}"
            title="Rename chat">✎</button>
          <button class="chat-action"
            data-local-delete="${escapeHTML(chat.id)}"
            title="Delete chat">×</button>
        </div>
      `)
      .join("");
  }

  function renderLocalMode() {
    const title = document.querySelector(".top-title");
    if (title) {
      title.innerHTML = `Kage <span class="online-dot"></span>
        <span style="font-size:11px;color:#aaa">LOCAL</span>`;
    }

    renderLocalChats();
    updateModeControls();
  }

  function updateModeControls() {
    let panel = $("kageLocalControls");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "kageLocalControls";
      panel.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:8px",
        "padding:8px 16px",
        "border-bottom:1px solid #252525",
        "background:#101010",
        "flex-wrap:wrap"
      ].join(";");

      const main = document.querySelector(".main");
      const topbar = document.querySelector(".topbar");

      if (main && topbar) {
        topbar.insertAdjacentElement("afterend", panel);
      } else {
        document.body.prepend(panel);
      }
    }

    panel.innerHTML = `
      <span style="color:#aaa;font-size:12px">AI mode</span>
      <button id="kageOnlineMode" class="tool-button"
        aria-pressed="${mode === "online"}">online</button>
      <button id="kageLocalMode" class="tool-button"
        aria-pressed="${mode === "local"}">local AI</button>
      <span id="kageModelStatus"
        style="font-size:12px;color:#999;margin-left:auto">
        ${mode === "local"
          ? (modelReady ? "model ready" : "model not loaded")
          : "cloud AI"}
      </span>
    `;

    $("kageOnlineMode").classList.toggle("mode-active", mode === "online");
    $("kageLocalMode").classList.toggle("mode-active", mode === "local");
  }

  function setStatus(message) {
    const status = $("kageModelStatus");
    if (status) status.textContent = message;
  }

  async function loadLocalModel() {
    if (generator) return generator;
    if (modelPromise) return modelPromise;

    modelPromise = (async () => {
      setStatus("loading AI library...");

      const { pipeline, env } = await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2"
      );

      // Keep downloaded model files in the browser's cache when possible.
      env.allowLocalModels = false;
      env.allowRemoteModels = true;

      setStatus("downloading model... first launch may take a while");

      const options = {
        dtype: "q4"
      };

      // WebGPU may speed up inference on supported browsers and hardware.
      // WASM is the fallback for devices without WebGPU.
      if (navigator.gpu) {
        options.device = "webgpu";
      } else {
        options.device = "wasm";
      }

      generator = await pipeline(
        "text-generation",
        MODEL_ID,
        options
      );

      modelReady = true;
      setStatus(
        navigator.gpu
          ? "local model ready · WebGPU"
          : "local model ready · WASM"
      );

      return generator;
    })();

    try {
      return await modelPromise;
    } catch (error) {
      modelPromise = null;
      generator = null;
      modelReady = false;
      setStatus("model failed to load");
      throw new Error(
        "Kage couldn't load the local model. This device or browser may not support it, or the model download failed. " +
        (error?.message || "")
      );
    }
  }

  function buildPromptMessages() {
    const recent = currentMessages
      .filter((message) =>
        message.role === "user" || message.role === "assistant"
      )
      .slice(-MAX_HISTORY)
      .map((message) => ({
        role: message.role,
        content: String(message.content || "")
      }));

    return [
      {
        role: "system",
        content:
          "You are Kage, a helpful AI assistant. " +
          "Write naturally, casually, and clearly. " +
          "Use lowercase when it feels natural. " +
          "Be direct, accurate, and useful. " +
          "Do not pretend to have searched the web if you have not. " +
          "If you do not know something, say so."
      },
      ...recent
    ];
  }

  async function generateLocalReply() {
    const model = await loadLocalModel();
    const messages = buildPromptMessages();

    const output = await model(messages, {
      max_new_tokens: 384,
      do_sample: true,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.08
    });

    const result = output?.[0]?.generated_text;
    let answer = "";

    if (Array.isArray(result)) {
      answer = result[result.length - 1]?.content || "";
    } else if (typeof result === "string") {
      answer = result;
    }

    answer = String(answer).trim();

    if (!answer) {
      throw new Error("The local model returned an empty reply. Try again.");
    }

    return answer;
  }

  async function wikipediaSearch(query) {
    const url = new URL("https://en.wikipedia.org/w/api.php");

    url.search = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: "5",
      format: "json",
      origin: "*"
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Live search failed. Check your internet connection.");
    }

    const data = await response.json();

    return (data.query?.search || []).map((item) => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]*>/g, ""),
      url:
        "https://en.wikipedia.org/wiki/" +
        encodeURIComponent(item.title.replace(/ /g, "_"))
    }));
  }

  async function localSendMessage(rawText, options = {}) {
    if (localBusy) return;

    const text = String(rawText || "").trim();

    if (!text && !options.regenerate && !attachedText) return;

    if (imageMode && !options.regenerate) {
      alert(
        "Image generation is not included in this local text model. Switch to online mode to use Kage's configured image service."
      );
      return;
    }

    localBusy = true;
    setBusy(true);

    try {
      if (!options.regenerate) {
        let userText = text;

        if (attachedText) {
          userText += `\n\nAttached file contents:\n${attachedText}`;
        }

        if (searchMode && text) {
          try {
            setStatus("searching the web...");
            const results = await wikipediaSearch(text);

            if (results.length) {
              userText += "\n\nLive search results:\n" +
                results.map((item, index) =>
                  `${index + 1}. ${item.title}\n${item.snippet}\n${item.url}`
                ).join("\n\n");
            } else {
              userText +=
                "\n\nNo search results were found. Be transparent about uncertainty.";
            }
          } catch (error) {
            userText +=
              "\n\nLive search was unavailable. Do not claim that the information was verified online.";
          }
        }

        if (!currentChatId) createLocalChat(userText);

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
        const lastAssistant = currentMessages.findLastIndex
          ? currentMessages.findLastIndex((item) => item.role === "assistant")
          : (() => {
              for (let i = currentMessages.length - 1; i >= 0; i--) {
                if (currentMessages[i].role === "assistant") return i;
              }
              return -1;
            })();

        if (lastAssistant >= 0) currentMessages.splice(lastAssistant, 1);
      }

      renderMessages();
      saveCurrentLocalChat();

      setStatus("thinking locally...");
      const reply = await generateLocalReply();

      currentMessages.push({
        id: makeId(),
        role: "assistant",
        content: reply,
        created_at: new Date().toISOString()
      });

      renderMessages();
      saveCurrentLocalChat();

      searchMode = false;
      imageMode = false;
      updateModes();
      renderLocalMode();
    } catch (error) {
      showError(error);
    } finally {
      localBusy = false;
      setBusy(false);
      $("prompt").focus();

      if (mode === "local") {
        setStatus(modelReady ? "local model ready" : "model not loaded");
      }
    }
  }

  function localNewChat() {
    currentChatId = null;
    currentMessages = [];
    attachedText = "";

    $("prompt").value = "";
    $("attachmentName").textContent = "";
    $("messageList").innerHTML = "";
    $("welcome").hidden = false;

    renderLocalChats();
    saveLocalCache();
    $("prompt").focus();
  }

  function openLocalChat(id) {
    const chat = getLocalChats().find((item) => item.id === id);
    if (!chat) return;

    currentChatId = chat.id;
    currentMessages = Array.isArray(chat.messages) ? chat.messages : [];

    renderMessages();
    renderLocalChats();
    saveLocalCache();

    if (window.innerWidth <= 650) {
      $("sidebar").classList.remove("open");
    }
  }

  function switchMode(nextMode) {
    mode = nextMode;
    localStorage.setItem(MODE_KEY, mode);

    if (mode === "local") {
      showingDeleted = false;
      renderLocalMode();
    } else {
      original.loadChats?.();
      updateModeControls();
    }
  }

  // Replace the existing global functions while preserving cloud mode.
  window.sendMessage = async (text, options = {}) => {
    if (mode === "local") return localSendMessage(text, options);
    return original.sendMessage?.(text, options);
  };

  window.loadChats = async () => {
    if (mode === "local") return renderLocalChats();
    return original.loadChats?.();
  };

  window.openChat = async (id) => {
    if (mode === "local") return openLocalChat(id);
    return original.openChat?.(id);
  };

  window.newChat = () => {
    if (mode === "local") return localNewChat();
    return original.newChat?.();
  };

  document.addEventListener("click", async (event) => {
    const onlineButton = event.target.closest("#kageOnlineMode");
    const localButton = event.target.closest("#kageLocalMode");

    if (onlineButton) {
      event.preventDefault();
      switchMode("online");
      return;
    }

    if (localButton) {
      event.preventDefault();
      switchMode("local");
      return;
    }

    if (mode !== "local") return;

    const open = event.target.closest("[data-local-open]");
    const rename = event.target.closest("[data-local-rename]");
    const remove = event.target.closest("[data-local-delete]");

    if (open || rename || remove) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (open) {
      openLocalChat(open.dataset.localOpen);
      return;
    }

    if (rename) {
      const id = rename.dataset.localRename;
      const chats = getLocalChats();
      const chat = chats.find((item) => item.id === id);
      if (!chat) return;

      const title = prompt("rename chat:", chat.title);
      if (title === null || !title.trim()) return;

      chat.title = title.trim();
      saveLocalChats(chats);
      renderLocalChats();
      return;
    }

    if (remove) {
      const id = remove.dataset.localDelete;
      if (!confirm("delete this local chat?")) return;

      saveLocalChats(getLocalChats().filter((item) => item.id !== id));

      if (currentChatId === id) localNewChat();
      renderLocalChats();
    }
  }, true);

  // Handle message controls in local mode without calling cloud endpoints.
  $("messageList")?.addEventListener("click", (event) => {
    if (mode !== "local") return;

    const edit = event.target.closest("[data-edit]");
    const regenerate = event.target.closest("[data-regenerate]");
    const remove = event.target.closest("[data-delete-message]");

    if (!edit && !regenerate && !remove) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (edit) {
      const index = Number(edit.dataset.edit);
      const item = currentMessages[index];
      if (!item) return;

      const revised = prompt("edit your message:", item.content);
      if (revised === null || !revised.trim()) return;

      currentMessages = currentMessages.slice(0, index);
      currentMessages.push({
        id: makeId(),
        role: "user",
        content: revised.trim(),
        created_at: new Date().toISOString()
      });

      saveCurrentLocalChat();
      renderMessages();
      localSendMessage("", { regenerate: true });
      return;
    }

    if (regenerate) {
      localSendMessage("", { regenerate: true });
      return;
    }

    if (remove) {
      const index = Number(remove.dataset.deleteMessage);
      if (!confirm("delete this message and everything after it?")) return;

      currentMessages = currentMessages.slice(0, index);
      saveCurrentLocalChat();
      renderMessages();
    }
  }, true);

  // Export local conversations when local mode is active.
  $("exportButton")?.addEventListener("click", (event) => {
    if (mode !== "local") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const blob = new Blob(
      [JSON.stringify(getLocalChats(), null, 2)],
      { type: "application/json" }
    );

    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);

    link.href = objectUrl;
    link.download = "kage-local-chats.json";
    link.click();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }, true);

  $("newChat")?.addEventListener("click", (event) => {
    if (mode !== "local") return;

    event.preventDefault();
    event.stopImmediatePropagation();
    localNewChat();
  }, true);

  // Start in the previously selected mode.
  updateModeControls();

  if (mode === "local") {
    renderLocalMode();
  }
})();
