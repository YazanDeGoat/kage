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

            <button id="upload">
                +
            </button>

            <input
                id="messageInput"
                placeholder="message kage..."
                autocomplete="off"
            >

            <button id="talk">
                send
            </button>

            <button id="voice">
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


const messagesContainer =
    document.getElementById(
        "messages"
    );


function renderChats() {

    chatList.innerHTML = "";

    getChats().forEach(chat => {

        const item =
            document.createElement("div");

        item.className = "thread";

        item.textContent =
            chat.title;

        if (
            getActiveChat()?.id ===
            chat.id
        ) {
            item.classList.add("active");
        }

        item.onclick = () => {

            setActiveChat(chat.id);

            renderChats();

            renderMessages();

        };


        let pressTimer = null;


        item.addEventListener(
            "pointerdown",
            () => {

                pressTimer =
                    setTimeout(() => {

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

                            renderChats();

                            renderMessages();

                        }

                    }, 600);

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


        chatList.appendChild(item);

    });

}


newChatButton.onclick = () => {

    createChat();

    renderChats();

    renderMessages();

    messageInput.focus();

};


if (getChats().length === 0) {

    createChat();

}


if (!getActiveChat()) {

    setActiveChat(
        getChats()[0].id
    );

}


function renderMessages() {

    messagesContainer.innerHTML = "";

    getMessages().forEach(message => {

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

    });

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

}


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
        } = await reader.read();


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
            const line
            of events
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
                    JSON.parse(data);


                const token =
                    json?.choices?.[0]
                        ?.delta
                        ?.content;


                if (token) {

                    bubble.textContent +=
                        token;

                    messagesContainer.scrollTop =
                        messagesContainer.scrollHeight;

                }

            }

            catch {}

        }

    }

}


async function sendMessage() {

    const text =
        messageInput.value.trim();


    if (!text) {
        return;
    }


    if (!getActiveChat()) {

        createChat();

        renderChats();

    }


    addMessage(
        "user",
        text
    );


    messageInput.value = "";

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


renderChats();

renderMessages();
