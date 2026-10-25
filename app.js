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
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function saveLocalCache() {
  try {
    localStorage.setItem(STORAGE.cache, JSON.stringify({
      currentChatId,
      currentMessages,
      savedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn("Kage local cache could not be saved.", error);
  }
}

function loadLocalCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE.cache) || "{}");
    if (Array.isArray(cache.currentMessages)) {
      currentMessages = cache.currentMessages;
      currentChatId = cache.currentChatId || null;
      renderMessages();
    }
  } catch {
    // An invalid browser cache must not prevent Kage from opening.
  }
}

async function api(path, options = {}) {
  if (!apiBase) {
    throw new Error("Open Settings and enter your Kage backend URL first.");
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
      { ...options, headers }
    );
  } catch {
    throw new Error("Kage could not reach the backend. Check your connection and backend URL.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Backend request failed (${response.status}).`);
  }

  return data;
}

function showError(error) {
  alert(error?.message || "Something went wrong.");
}

function titleFrom(text) {
  const clean = String(text || "").trim().replace(/\s+/g, " ");
  return clean.length > 42 ? clean.slice(0, 42) + "…" : clean || "New chat";
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
  if (!apiBase) {
    $("chatList").innerHTML =
      '<div class="empty-note">Connect Kage in Settings to load saved chats.</div>';
    return;
  }

  try {
    const query = showingDeleted ? "?deleted=1" : "";
    const data = await api("/api/chats" + query);
    renderChatList(data.chats || []);
  } catch (error) {
    $("chatList").innerHTML =
      `<div class="empty-note">${escapeHTML(error.message)}</div>`;
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
          ? `<button class="chat-action" data-restore="${escapeHTML(chat.id)}" title="Restore chat">↶</button>`
          : `
            <button class="chat-action" data-rename="${escapeHTML(chat.id)}" title="Rename chat">✎</button>
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

    if (window.innerWidth <= 650) {
      $("sidebar").classList.remove("open");
    }
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
    const content = escapeHTML(message.content || "");

    return `
      <article class="message ${role}">
        <div class="message-role">${role === "user" ? "you" : "kage"}</div>
        <div class="message-content">${content}</div>
        <div class="message-actions">
          <button data-copy="${index}">Copy</button>
          ${
            role === "user"
              ? `<button data-edit="${index}">Edit & resend</button>`
              : `<button data-regenerate="${index}">Regenerate</button>`
          }
          <button data-delete-message="${index}" title="Delete message">Delete</button>
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

async function generateImage(prompt) {
  const data = await api("/api/image", {
    method: "POST",
    body: JSON.stringify({ prompt })
  });

  if (!data.dataURI) {
    throw new Error("The image model did not return an image.");
  }

  const imageWindow = window.open("", "_blank");

  if (!imageWindow) {
    const link = document.createElement("a");
    link.href = data.dataURI;
    link.download = "kage-generated-image.jpg";
    link.click();
    return;
  }

  imageWindow.document.write(`
    <!doctype html>
    <html>
      <head><title>Kage generated image</title>
      <style>
        body{margin:0;background:#111;color:#eee;font:16px system-ui;text-align:center}
        img{display:block;max-width:96vw;max-height:88vh;margin:20px auto}
        a{color:white}
      </style></head>
      <body>
        <h2>Kage generated image</h2>
        <img src="${data.dataURI}" alt="Image generated by Kage">
        <a download="kage-generated-image.jpg" href="${data.dataURI}">Save image</a>
      </body>
    </html>
  `);
  imageWindow.document.close();
}

async function sendMessage(rawText, options = {}) {
  if (busy) return;

  let text = String(rawText || "").trim();

  if (!text) return;

  if (!apiBase || !accessKey) {
    $("settingsDialog").showModal();
    alert("Connect your backend and enter your private access key in Settings.");
    return;
  }

  if (text.length > 12000) {
    alert("That message is too long. Keep it under 12,000 characters.");
    return;
  }

  setBusy(true);

  try {
    if (imageMode && !options.regenerate) {
      await generateImage(text);
      searchMode = false;
      imageMode = false;
      updateModes();
      return;
    }

    const firstUserMessage = currentMessages.find((message) => message.role === "user");
    await ensureChat(firstUserMessage?.content || text);

    if (!options.regenerate) {
      let userText = text;

      if (attachedText) {
        userText += `\n\nAttached file contents:\n${attachedText}`;
      }

      if (searchMode) {
        const results = await performSearch(text);

        if (results.length) {
          const searchContext = results.map((result, index) =>
            `${index + 1}. ${result.title}\n${result.snippet}\n${result.url}`
          ).join("\n\n");

          userText += "\n\nSearch results for reference:\n" + searchContext;
        } else {
          userText += "\n\nNo search results were returned. Be transparent about that.";
        }
      }

      const userMessage = {
        role: "user",
        content: userText
      };

      currentMessages.push(userMessage);
      renderMessages();
      saveLocalCache();

      $("prompt").value = "";
      $("attachmentName").textContent = "";
      attachedText = "";
    }

    const data = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        chatId: currentChatId,
        regenerate: Boolean(options.regenerate),
        message: options.regenerate ? "" : currentMessages[currentMessages.length - 1]?.content
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

    // Reload from the server so a failed AI request doesn't leave
    // an unsaved message pretending to have been sent.
    if (currentChatId) {
      try {
        const data = await api(`/api/chats/${encodeURIComponent(currentChatId)}`);
        currentMessages = data.messages || [];
        renderMessages();
        saveLocalCache();
      } catch {
        // Keep the local cache available if the backend is temporarily down.
      }
    }
  } finally {
    setBusy(false);
    $("prompt").focus();
  }
}

$("composer").addEventListener("submit", (event) => {
  event.preventDefault();

  if (busy) return;

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
  if (confirm("Clear the saved Kage cache in this browser? Server chats will not be deleted.")) {
    localStorage.removeItem(STORAGE.cache);
    currentChatId = null;
    currentMessages = [];
    renderMessages();
    $("welcome").hidden = false;
  }
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
    if (open) {
      await openChat(open.dataset.open);
      return;
    }

    if (rename) {
      const id = rename.dataset.rename;
      const existing = rename.parentElement.querySelector(".chat-select").textContent.trim();
      const title = prompt("New chat name:", existing);

      if (title === null) return;
      if (!title.trim()) {
        alert("Chat name cannot be empty.");
        return;
      }

      await api(`/api/chats/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ title: title.trim() })
      });

      await loadChats();
      return;
    }

    if (remove) {
      const id = remove.dataset.delete;

      if (!confirm("Move this chat to Recently deleted? You can restore it later.")) return;

      await api(`/api/chats/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

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
      const message = currentMessages[Number(copy.dataset.copy)];
      await navigator.clipboard.writeText(message.content || "");
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

      // Rebuild the assistant answer from the edited conversation.
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

      if (!confirm("Delete this message and all messages after it?")) return;

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
    alert("For this version, text attachments must be under 100 KB.");
    event.target.value = "";
    return;
  }

  try {
    attachedText = await file.text();
    $("attachmentName").textContent = file.name;
  } catch {
    alert("Kage couldn't read that file.");
  }

  event.target.value = "";
});

$("voiceButton").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice input isn't supported by this browser. Try a supported browser and allow microphone access.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    $("prompt").value += ($("prompt").value ? " " : "") + transcript;
    $("prompt").dispatchEvent(new Event("input"));
  };

  recognition.onerror = () => {
    alert("Voice input failed. Check microphone permissions.");
  };

  recognition.start();
});

$("exportButton").addEventListener("click", async () => {
  try {
    const data = await api("/api/chats?export=1");
    const blob = new Blob([JSON.stringify(data.chats || [], null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kage-chats-backup.json";
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    console.warn("Kage offline shell was not registered.", error);
  });
}

loadLocalCache();
loadChats();
updateModes();
