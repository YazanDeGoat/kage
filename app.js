const $ = (id) => document.getElementById(id);

let apiBase = localStorage.getItem("kage_api_url") || "";
let currentChatId = null;
let currentMessages = [];
let showingDeleted = false;
let attachedText = "";

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function api(path, options = {}) {
  if (!apiBase) throw new Error("Set your Kage backend URL in Settings first.");
  return fetch(apiBase.replace(/\/+$/, "") + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  });
}

function notifyError(error) {
  alert(error?.message || "Something went wrong.");
}

function titleFrom(text) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 36 ? clean.slice(0, 36) + "…" : clean || "New chat";
}

async function loadChats() {
  try {
    const data = await api("/api/chats" + (showingDeleted ? "?deleted=1" : ""));
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
          ? `<button class="chat-action" data-restore="${escapeHTML(chat.id)}" title="Restore">↶</button>`
          : `<button class="chat-action" data-rename="${escapeHTML(chat.id)}" title="Rename">···</button>`
      }
    </div>
  `).join("");
}

async function openChat(id) {
  try {
    const data = await api(`/api/chats/${encodeURIComponent(id)}`);
    currentChatId = id;
    currentMessages = data.messages || [];
    $("welcome").hidden = true;
    renderMessages();
    await loadChats();
    if (window.innerWidth <= 650) $("sidebar").classList.remove("open");
  } catch (error) {
    notifyError(error);
  }
}

function newChat() {
  currentChatId = null;
  currentMessages = [];
  $("messageList").innerHTML = "";
  $("welcome").hidden = false;
  $("prompt").value = "";
  $("attachmentName").textContent = "";
  attachedText = "";
  $("prompt").focus();
  loadChats();
}

function renderMessages() {
  $("welcome").hidden = currentMessages.length > 0;
  $("messageList").innerHTML = currentMessages.map((message, index) => {
    const role = message.role === "user" ? "user" : "assistant";
    const text = escapeHTML(message.content || "");
    return `
      <article class="message ${role}">
        <div class="message-role">${role === "user" ? "you" : "kage"}</div>
        <div class="message-content">${text}</div>
        <div class="message-actions">
          <button data-copy="${index}">Copy</button>
          ${role === "user" ? `<button data-edit="${index}">Edit & resend</button>` : ""}
          ${role === "assistant" ? `<button data-regenerate="${index}">Regenerate</button>` : ""}
        </div>
      </article>`;
  }).join("");

  $("messages").scrollTop = $("messages").scrollHeight;
}

async function sendMessage(text, options = {}) {
  const message = text.trim();
  if (!message || $("sendButton").disabled) return;

  if (!apiBase) {
    $("settingsDialog").showModal();
    alert("Add your Cloudflare Worker URL in Settings before sending messages.");
    return;
  }

  $("sendButton").disabled = true;
  $("sendButton").textContent = "…";
  $("welcome").hidden = true;

  try {
    if (!currentChatId) {
      const created = await api("/api/chats", {
        method: "POST",
        body: JSON.stringify({ title: titleFrom(message) })
      });
      currentChatId = created.chat.id;
    }

    const visibleUserMessage = { role: "user", content: message };
    currentMessages.push(visibleUserMessage);
    renderMessages();
    $("prompt").value = "";
    $("attachmentName").textContent = "";
    attachedText = "";

    const data = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        chatId: currentChatId,
        message,
        regenerate: Boolean(options.regenerate)
      })
    });

    currentMessages = data.messages || [
      ...currentMessages,
      { role: "assistant", content: data.reply }
    ];
    renderMessages();
    await loadChats();
  } catch (error) {
    notifyError(error);
    await openChat(currentChatId).catch(() => {});
  } finally {
    $("sendButton").disabled = false;
    $("sendButton").textContent = "↑";
    $("prompt").focus();
  }
}

$("composer").addEventListener("submit", (event) => {
  event.preventDefault();
  let text = $("prompt").value.trim();
  if (attachedText) {
    text += `\n\n[Attached file contents]\n${attachedText}`;
  }
  sendMessage(text);
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
  $("settingsDialog").showModal();
});

$("saveSettings").addEventListener("click", async () => {
  apiBase = $("apiUrl").value.trim().replace(/\/+$/, "");
  localStorage.setItem("kage_api_url", apiBase);
  $("settingsDialog").close();
  await loadChats();
});

$("deletedButton").addEventListener("click", async () => {
  showingDeleted = !showingDeleted;
  $("deletedButton").textContent = showingDeleted ? "← Back to chats" : "Recently deleted";
  await loadChats();
});

$("chatList").addEventListener("click", async (event) => {
  const open = event.target.closest("[data-open]");
  const rename = event.target.closest("[data-rename]");
  const restore = event.target.closest("[data-restore]");

  try {
    if (open) await openChat(open.dataset.open);

    if (rename) {
      const id = rename.dataset.rename;
      const existing = rename.parentElement.querySelector(".chat-select").textContent.trim();
      const title = prompt("New chat name:", existing);
      if (title && title.trim()) {
        await api(`/api/chats/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ title: title.trim() })
        });
        await loadChats();
      } else if (title !== null) {
        alert("Chat name cannot be empty.");
      }
    }

    if (restore) {
      await api(`/api/chats/${encodeURIComponent(restore.dataset.restore)}/restore`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await loadChats();
    }
  } catch (error) {
    notifyError(error);
  }
});

$("messageList").addEventListener("click", async (event) => {
  const copy = event.target.closest("[data-copy]");
  const edit = event.target.closest("[data-edit]");
  const regenerate = event.target.closest("[data-regenerate]");

  if (copy) {
    const item = currentMessages[Number(copy.dataset.copy)];
    try {
      await navigator.clipboard.writeText(item.content);
      copy.textContent = "Copied!";
      setTimeout(() => copy.textContent = "Copy", 1000);
    } catch {
      alert("Copy was blocked by your browser.");
    }
  }

  if (edit) {
    const index = Number(edit.dataset.edit);
    const item = currentMessages[index];
    const edited = prompt("Edit your message:", item.content);
    if (edited && edited.trim()) {
      $("prompt").value = edited.trim();
      $("prompt").focus();
      alert("Your edited message is ready. Send it to submit it as a new message.");
    }
  }

  if (regenerate) {
    const index = Number(regenerate.dataset.regenerate);
    const previousUser = [...currentMessages.slice(0, index)]
      .reverse().find((item) => item.role === "user");
    if (previousUser) {
      await sendMessage(previousUser.content, { regenerate: true });
    }
  }
});

$("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 100_000) {
    alert("For now, text attachments must be under 100 KB.");
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
    alert("Voice input isn't supported by this browser. Try a browser with speech recognition.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    $("prompt").value += event.results[0][0].transcript;
    $("prompt").dispatchEvent(new Event("input"));
  };
  recognition.onerror = () => alert("Voice input failed. Check microphone permission.");
  recognition.start();
});

$("exportButton").addEventListener("click", async () => {
  try {
    const data = await api("/api/chats?export=1");
    const blob = new Blob([JSON.stringify(data.chats, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kage-chats-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    notifyError(error);
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    $("prompt").value = button.dataset.prompt;
    $("prompt").focus();
  });
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

loadChats();
