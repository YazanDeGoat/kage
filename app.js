"use strict";

const $ = (id) => document.getElementById(id);

const STORAGE = {
  url: "kage_api_url",
  key: "kage_access_key",
  cache: "kage_local_cache_v2"
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

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

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
    const data = JSON.parse(localStorage.getItem(STORAGE.cache) || "{}");
    currentChatId = data.currentChatId || null;
    currentMessages = Array.isArray(data.currentMessages) ? data.currentMessages : [];
    renderMessages();
  } catch {
    currentChatId = null;
    currentMessages = [];
  }
}

async function api(path, options = {}) {
  if (!apiBase) throw new Error("Enter your backend URL in Settings.");

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (accessKey) headers.set("Authorization", `Bearer ${accessKey}`);

  let response;

  try {
    response = await fetch(apiBase.replace(/\/+$/, "") + path, {
      ...options,
      headers
    });
  } catch {
    throw new Error("Kage couldn't reach its backend. Check the URL and your internet connection.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }

  return data;
}

function showError(error) {
  alert(error?.message || "Something went wrong.");
}

function titleFrom(text) {
  const title = String(text || "").trim().replace(/\s+/g, " ");
  return title.length > 42 ? title.slice(0, 42) + "…" : title || "New chat";
}

function setBusy(value) {
  busy = value;
  $("sendButton").disabled = value;
  $("sendButton").textContent = value ? "…" : "↑";
}

function updateModes() {
  $("searchButton").classList.toggle("mode-active", searchMode);
  $("imageButton").classList.toggle("mode-active", imageMode);
  $("searchButton").setAttribute("aria-pressed", String(searchMode));
  $("imageButton").setAttribute("aria-pressed", String(imageMode));
}

async function loadChats() {
  if (!apiBase || !accessKey) {
    $("chatList").innerHTML =
      '<div class="empty-note">Connect Kage in Settings to load saved chats.</div>';
    return;
  }

  try {
    const data = await api("/api/chats" + (showingDeleted ? "?deleted=1" : ""));
    renderChatList(data.chats || []);
  } catch (error) {
    $("chatList").innerHTML = `<div class="empty-note">${escapeHTML(error.message)}</div>`;
  }
}

function renderChatList(chats) {
  if (!chats.length) {
    $("chatList").innerHTML = '<div class="empty-note">No chats here yet.</div>';
    return;
  }

  $("chatList").innerHTML = chats.map((chat) => `
    <div class="chat-item ${chat.id === currentChatId ? "active" : ""}">
      <button class="chat-select" data-open="${escapeHTML(chat.id)}">
        ${escapeHTML(chat.title || "New chat")}
      </button>
      ${
        showingDeleted
          ? `<button class="chat-action" data-restore="${escapeHTML(chat.id)}" title="Restore">↶</button>`
          : `
            <button class="chat-action" data-rename="${escapeHTML(chat.id)}" title="Rename">✎</button>
            <button class="chat-action" data-delete="${escapeHTML(chat.id)}" title="Move to Recently deleted">×</button>
          `
      }
    </div>
  `).join("");
}

async function openChat(id) {
  try {
    const data = await api(`/api/chats/${encodeURIComponent(id)}`);
    currentChatId = id;
    currentMessages = data.messages || [];
    renderMessages();
    saveLocalCache();
    await loadChats();

    if (window.innerWidth <= 650) $("sidebar").classList.remove("open");
  } catch (error) {
    showError(error);
  }
}

function newChat() {
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

function renderMessages() {
  $("welcome").hidden = currentMessages.length > 0;

  $("messageList").innerHTML = currentMessages.map((message, index) => {
    const role = message.role === "user" ? "user" : "assistant";

    return `
      <article class="message ${role}">
        <div class="message-role">${role === "user" ? "you" : "kage"}</div>
        <div class="message-content">${escapeHTML(message.content || "")}</div>
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
  }).join("");

  $("messages").scrollTop = $("messages").scrollHeight;
}

async function ensureChat(firstMessage) {
  if (currentChatId) return currentChatId;

  const data = await api("/api/chats", {
    method: "POST",
    body: JSON.stringify({ title: titleFrom(firstMessage) })
  });

  currentChatId = data.chat.id;
  return currentChatId;
}

async function performSearch(query) {
  const data = await api(`/api/search?q=${encodeURIComponent(query)}`);
  return data.results || [];
}

async function generateImage(promptText) {
  // Open the tab before the asynchronous request to reduce popup blocking.
  const imageWindow = window.open("about:blank", "_blank");

  try {
    const data = await api("/api/image", {
      method: "POST",
      body: JSON.stringify({ prompt: promptText })
    });

    if (!data.dataURI) throw new Error("The image model returned no image.");

    if (!imageWindow) {
      const link = document.createElement("a");
      link.href = data.dataURI;
      link.download = "kage-generated-image.jpg";
      link.click();
    } else {
      imageWindow.document.open();
      imageWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Kage generated image</title>
            <style>
              body{margin:0;background:#111;color:#eee;font:16px system-ui;text-align:center}
              img{display:block;max-width:96vw;max-height:85vh;margin:20px auto}
              a{color:white}
            </style>
          </head>
          <body>
            <h2>Kage generated image</h2>
            <img src="${data.dataURI}" alt="Image generated by Kage">
            <a download="kage-generated-image.jpg" href="${data.dataURI}">Save image</a>
          </body>
        </html>
      `);
      imageWindow.document.close();
    }
  } catch (error) {
    if (imageWindow && !imageWindow.closed) imageWindow.close();
    throw error;
  }
}

async function sendMessage(rawText, options = {}) {
  if (busy) return;

  let text = String(rawText || "").trim();

  // Regeneration uses the existing conversation and doesn't need new text.
  if (!text && !options.regenerate && !attachedText) return;

  if (!apiBase || !accessKey) {
    $("apiUrl").value = apiBase;
    $("accessKey").value = accessKey;
    $("settingsDialog").showModal();
    alert("Enter your backend URL and private access key in Settings.");
    return;
  }

  if (text.length > 12000) {
    alert("Keep messages under 12,000 characters.");
    return;
  }

  setBusy(true);

  try {
    if (imageMode && !options.regenerate) {
      await generateImage(text);
      imageMode = false;
      searchMode = false;
      updateModes();
      return;
    }

    const firstUserMessage = currentMessages.find((item) => item.role === "user");
    await ensureChat(firstUserMessage?.content || text || "New chat");

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
          userText += "\n\nNo search results were returned. Be transparent about uncertainty.";
        }
      }

      currentMessages.push({ role: "user", content: userText });
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
        message: options.regenerate ? "" : latestUserMessage?.content
      })
    });

    currentMessages = data.messages || currentMessages;
    renderMessages();
    saveLocalCache();

    searchMode = false;
    updateModes();

    await loadChats();
  } catch (error) {
    showError(error);

    if (currentChatId) {
      try {
        const data = await api(`/api/chats/${encodeURIComponent(currentChatId)}`);
        currentMessages = data.messages || [];
        renderMessages();
        saveLocalCache();
      } catch {
        // Keep the local cache if the server is temporarily unreachable.
      }
    }
  } finally {
    setBusy(false);
    $("prompt").focus();
  }
}

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
  $("prompt").style.height = Math.min($("prompt").scrollHeight, 180) + "px";
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
  await loadChats();
});

$("clearLocalCache").addEventListener("click", () => {
  if (!confirm("Clear this browser's Kage cache? Server chats will remain saved.")) return;

  localStorage.removeItem(STORAGE.cache);
  currentChatId = null;
  currentMessages = [];
  renderMessages();
  $("welcome").hidden = false;
});

$("deletedButton").addEventListener("click", async () => {
  showingDeleted = !showingDeleted;
  $("deletedButton").textContent = showingDeleted ? "← Back to chats" : "Recently deleted";
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
  const open = event.target.closest("[data-open]");
  const rename = event.target.closest("[data-rename]");
  const remove = event.target.closest("[data-delete]");
  const restore = event.target.closest("[data-restore]");

  try {
    if (open) return await openChat(open.dataset.open);

    if (rename) {
      const id = rename.dataset.rename;
      const existing = rename.parentElement.querySelector(".chat-select").textContent.trim();
      const title = prompt("New chat name:", existing);

      if (title === null) return;
      if (!title.trim()) return alert("Chat name cannot be empty.");

      await api(`/api/chats/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ title: title.trim() })
      });

      await loadChats();
      return;
    }

    if (remove) {
      const id = remove.dataset.delete;

      if (!confirm("Move this chat to Recently deleted?")) return;

      await api(`/api/chats/${encodeURIComponent(id)}`, { method: "DELETE" });

      if (currentChatId === id) newChat();
      await loadChats();
      return;
    }

    if (restore) {
      await api(`/api/chats/${encodeURIComponent(restore.dataset.restore)}/restore`, {
        method: "POST",
        body: JSON.stringify({})
      });

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
      setTimeout(() => copy.textContent = "Copy", 1000);
      return;
    }

    if (edit) {
      const index = Number(edit.dataset.edit);
      const original = currentMessages[index];
      const edited = prompt("Edit your message:", original.content);

      if (edited === null || !edited.trim()) return;

      await api(
        `/api/chats/${encodeURIComponent(currentChatId)}/messages/${encodeURIComponent(original.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ content: edited.trim() })
        }
      );

      const data = await api(`/api/chats/${encodeURIComponent(currentChatId)}`);
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

      if (!confirm("Delete this message and everything after it?")) return;

      await api(
        `/api/chats/${encodeURIComponent(currentChatId)}/messages/${encodeURIComponent(message.id)}`,
        { method: "DELETE" }
      );

      const data = await api(`/api/chats/${encodeURIComponent(currentChatId)}`);
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
    alert("Text attachments must be under 100 KB in this version.");
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
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice input isn't supported by this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    $("prompt").value += ($("prompt").value ? " " : "") + event.results[0][0].transcript;
    $("prompt").dispatchEvent(new Event("input"));
  };

  recognition.onerror = () => alert("Voice input failed. Check microphone permissions.");
  recognition.start();
});

$("exportButton").addEventListener("click", async () => {
  try {
    const data = await api("/api/chats?export=1");
    const blob = new Blob([JSON.stringify(data.chats || [], null, 2)], {
      type: "application/json"
    });

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "kage-chats-backup.json";
    link.click();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    showError(error);
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    $("prompt").value = button.dataset.prompt;
    $("prompt").focus();
  });
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("Kage offline shell wasn't registered.", error);
  });
}

loadLocalCache();
loadChats();
updateModes();
