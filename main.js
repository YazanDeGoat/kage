import { createSidebar } from "./components/sidebar.js";
import {
    createChat,
    getChats,
    setActiveChat,
    getActiveChat,
    addMessage,
    getMessages,
    renameChat,
    deleteChat
} from "./database/threads.js";
const KAGE_SERVER = "";
const app =
    document.getElementById("app");
app.innerHTML = `
<div class="layout">
    ${createSidebar()}
    <main class="chat">
        <div id="messages"></div>
        <div class="inputBar">
            <button id="upload" type="button">
                +
            </button>
            <input
                id="messageInput"
                placeholder="message kage..."
                autocomplete="off"
            >
            <button id="talk" type="button">
                send
            </button>
            <button id="voice" type="button">
                🎙
            </button>
        </div>
    </main>
</div>
`;
const newChatButton =
    document.getElementById(
        "newChatButton"
    );
const chatList =
    document.getElementById(
        "chatList"
    );
const messageInput =
    document.getElementById(
        "messageInput"
    );
const talkButton =
    document.getElementById(
        "talk"
    );
const uploadButton =
    document.getElementById(
        "upload"
    );
const messagesContainer =
    document.getElementById(
        "messages"
    );
/* =========================
   ATTACHMENT PICKER
========================= */
const filePicker =
    document.createElement("input");
filePicker.type = "file";
filePicker.accept =
    "image/*,video/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip";
filePicker.multiple = true;
filePicker.style.display =
    "none";
document.body.appendChild(
    filePicker
);
uploadButton.onclick = () => {
    filePicker.value = "";
    filePicker.click();
};
filePicker.addEventListener(
    "change",
    () => {
        const files =
            Array.from(
                filePicker.files || []
            );
        if (!files.length) {
            return;
        }
        files.forEach(file => {
            showAttachment(
                file
            );
        });
    }
);
/* =========================
   SHOW ATTACHMENT
========================= */
function showAttachment(file) {
    const wrapper =
        document.createElement(
            "div"
        );
    wrapper.className =
        "message user attachmentMessage";
    const title =
        document.createElement(
            "div"
        );
    title.textContent =
        "📎 " + file.name;
    wrapper.appendChild(
        title
    );
    if (
        file.type.startsWith(
            "image/"
        )
    ) {
        const image =
            document.createElement(
                "img"
            );
        image.className =
            "generatedImage";
        image.alt =
            file.name;
        image.src =
            URL.createObjectURL(
                file
            );
        wrapper.appendChild(
            image
        );
    }
    if (
        file.type.startsWith(
            "video/"
        )
    ) {
        const video =
            document.createElement(
                "video"
            );
        video.className =
            "generatedVideo";
        video.controls =
            true;
        video.src =
            URL.createObjectURL(
                file
            );
        wrapper.appendChild(
            video
        );
    }
    messagesContainer.appendChild(
        wrapper
    );
    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}
/* =========================
   CHAT LIST
========================= */
function renderChats() {
    chatList.innerHTML = "";
    getChats().forEach(chat => {
        const item =
            document.createElement(
                "div"
            );
        item.className =
            "thread";
        item.textContent =
            chat.title;
        if (
            getActiveChat()?.id ===
            chat.id
        ) {
            item.classList.add(
                "active"
            );
        }
        item.onclick = () => {
            setActiveChat(
                chat.id
            );
            renderChats();
            renderMessages();
        };
        let pressTimer = null;
        item.addEventListener(
            "pointerdown",
            () => {
                pressTimer =
                    setTimeout(
                        () => {
                            const action =
                                prompt(
                                    "type rename or delete"
                                );
                            if (
                                action ===
                                "rename"
                            ) {
                                const title =
                                    prompt(
                                        "new chat name"
                                    );
                                if (title) {
                                    renameChat(
                                        chat.id,
                                        title
                                    );
                                    renderChats();
                                }
                            }
                            if (
                                action ===
                                "delete"
                            ) {
                                deleteChat(
                                    chat.id
                                );
                                if (
                                    getChats()
                                        .length === 0
                                ) {
                                    createChat();
                                }
                                if (
                                    !getActiveChat()
                                ) {
                                    setActiveChat(
                                        getChats()[0]
                                            .id
                                    );
                                }
                                renderChats();
                                renderMessages();
                            }
                        },
                        600
                    );
            }
        );
        item.addEventListener(
            "pointerup",
            () => {
                clearTimeout(
                    pressTimer
                );
            }
        );
        item.addEventListener(
            "pointercancel",
            () => {
                clearTimeout(
                    pressTimer
                );
            }
        );
        chatList.appendChild(
            item
        );
    });
}
/* =========================
   NEW CHAT
========================= */
newChatButton.onclick = () => {
    const chat =
        createChat();
    setActiveChat(
        chat.id
    );
    renderChats();
    renderMessages();
    messageInput.focus();
};
/* =========================
   INITIAL CHAT
========================= */
if (
    getChats().length === 0
) {
    createChat();
}
if (
    !getActiveChat() &&
    getChats().length > 0
) {
    setActiveChat(
        getChats()[0].id
    );
}
/* =========================
   RENDER MESSAGES
========================= */
function renderMessages() {
    messagesContainer.innerHTML = "";
    getMessages().forEach(
        message => {
            const bubble =
                document.createElement(
                    "div"
                );
            bubble.className =
                message.sender === "user"
                    ? "message user"
                    : "message kage";
            bubble.textContent =
                message.text || "";
            messagesContainer.appendChild(
                bubble
            );
        }
    );
    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}
/* =========================
   STREAMING
========================= */
async function streamKageResponse(
    prompt,
    bubble
) {
    const response =
        await fetch(
            KAGE_SERVER +
            "/api/chat-stream",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    prompt
                })
            }
        );
    if (!response.ok) {
        let errorText =
            "kage streaming failed";
        try {
            const error =
                await response.json();
            errorText =
                error.text ||
                errorText;
        }
        catch {}
        throw new Error(
            errorText
        );
    }
    if (!response.body) {
        throw new Error(
            "stream unavailable"
        );
    }
    const reader =
        response.body.getReader();
    const decoder =
        new TextDecoder();
    let buffer = "";
    while (true) {
        const {
            value,
            done
        } =
            await reader.read();
        if (done) {
            break;
        }
        buffer +=
            decoder.decode(
                value,
                {
                    stream: true
                }
            );
        const events =
            buffer.split("\n");
        buffer =
            events.pop() || "";
        for (
            const line of events
        ) {
            const trimmed =
                line.trim();
            if (
                !trimmed ||
                !trimmed.startsWith(
                    "data:"
                )
            ) {
                continue;
            }
            const data =
                trimmed
                    .slice(5)
                    .trim();
            if (
                data ===
                "[DONE]"
            ) {
                continue;
            }
            try {
                const json =
                    JSON.parse(
                        data
                    );
                const token =
                    json
                        ?.choices?.[0]
                        ?.delta
                        ?.content;
                if (token) {
                    bubble.textContent +=
                        token;
                    messagesContainer.scrollTop =
                        messagesContainer
                            .scrollHeight;
                }
            }
            catch {}
        }
    }
}
/* =========================
   SEND MESSAGE
========================= */
async function sendMessage() {
    const text =
        messageInput.value.trim();
    if (!text) {
        return;
    }
    if (!getActiveChat()) {
        const chat =
            createChat();
        setActiveChat(
            chat.id
        );
        renderChats();
    }
    addMessage(
        "user",
        text
    );
    messageInput.value =
        "";
    renderMessages();
    const bubble =
        document.createElement(
            "div"
        );
    bubble.className =
        "message kage";
    bubble.textContent =
        "";
    messagesContainer.appendChild(
        bubble
    );
    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
    try {
        await streamKageResponse(
            text,
            bubble
        );
        const finalText =
            bubble.textContent.trim();
        if (finalText) {
            addMessage(
                "kage",
                finalText
            );
        }
    }
    catch (error) {
        console.error(
            "KAGE STREAM ERROR:",
            error
        );
        bubble.textContent =
            "connection failed: " +
            error.message;
    }
    renderChats();
}
talkButton.onclick =
    sendMessage;
messageInput.addEventListener(
    "keydown",
    event => {
        if (
            event.key ===
            "Enter"
        ) {
            sendMessage();
        }
    }
);
/* =========================
   START KAGE
========================= */
renderChats();
renderMessages();
