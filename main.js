import {
    createSidebar
} from "./components/sidebar.js";

import {
    createChat,
    getChats,
    setActiveChat,
    getActiveChat,
    addMessage,
    getMessages,
    updateMessage,
    renameChat,
    deleteChat
} from "./database/threads.js";


const app =
    document.getElementById("app");


let selectedFiles = [];


app.innerHTML = `

<div class="layout">

    ${createSidebar()}

    <main class="chat">

        <header class="chatHeader">

            <div class="chatTitle">
                KAGE
            </div>

        </header>


        <section
            id="messages"
            class="messages"
        ></section>


        <div
            id="attachmentPreview"
            class="attachmentPreview"
        ></div>


        <div class="inputBar">

            <button
                id="upload"
                class="plusButton"
                type="button"
            >
                +
            </button>


            <input
                id="fileInput"
                type="file"
                multiple
                hidden
                accept="
                    image/*,
                    video/*,
                    .pdf,
                    .txt,
                    .csv,
                    .doc,
                    .docx,
                    .xls,
                    .xlsx,
                    .ppt,
                    .pptx
                "
            >


            <input
                id="messageInput"
                type="text"
                placeholder="message kage..."
                autocomplete="off"
            >


            <button
                id="talk"
                type="button"
            >
                send
            </button>


            <button
                id="voice"
                type="button"
            >
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


const messagesElement =
    document.getElementById(
        "messages"
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


const fileInput =
    document.getElementById(
        "fileInput"
    );


const attachmentPreview =
    document.getElementById(
        "attachmentPreview"
    );


function ensureChatExists() {

    if (
        getChats().length === 0
    ) {

        createChat();

    }

    if (
        !getActiveChat()
    ) {

        setActiveChat(
            getChats()[0].id
        );

    }

}


ensureChatExists();


function renderChats() {

    chatList.innerHTML = "";

    getChats().forEach(
        chat => {

            const item =
                document.createElement(
                    "button"
                );

            item.type =
                "button";

            item.className =
                "thread";

            if (
                getActiveChat()?.id ===
                chat.id
            ) {

                item.classList.add(
                    "active"
                );

            }

            item.textContent =
                chat.title;


            item.addEventListener(
                "click",
                () => {

                    setActiveChat(
                        chat.id
                    );

                    selectedFiles =
                        [];

                    renderAttachmentPreview();

                    renderChats();

                    renderMessages();

                }
            );


            let timer = null;


            item.addEventListener(
                "pointerdown",
                event => {

                    if (
                        event.pointerType ===
                        "mouse"
                    ) {
                        return;
                    }

                    timer =
                        setTimeout(
                            () => {

                                chatOptions(
                                    chat
                                );

                            },
                            650
                        );

                }
            );


            const cancel =
                () => {

                    clearTimeout(
                        timer
                    );

                };


            item.addEventListener(
                "pointerup",
                cancel
            );

            item.addEventListener(
                "pointercancel",
                cancel
            );

            item.addEventListener(
                "pointerleave",
                cancel
            );


            item.addEventListener(
                "contextmenu",
                event => {

                    event.preventDefault();

                    chatOptions(
                        chat
                    );

                }
            );


            chatList.appendChild(
                item
            );

        }
    );

}


function chatOptions(chat) {

    const action =
        prompt(
            "type rename or delete"
        );


    if (
        action === "rename"
    ) {

        const name =
            prompt(
                "new chat name",
                chat.title
            );

        if (
            name &&
            name.trim()
        ) {

            renameChat(
                chat.id,
                name
            );

            renderChats();

        }

    }


    if (
        action === "delete"
    ) {

        deleteChat(
            chat.id
        );

        renderChats();

        renderMessages();

    }

}


newChatButton.onclick =
    () => {

        createChat();

        selectedFiles =
            [];

        renderAttachmentPreview();

        renderChats();

        renderMessages();

        messageInput.focus();

    };


function renderMessages() {

    messagesElement.innerHTML = "";


    const messages =
        getMessages();


    messages.forEach(
        message => {

            const bubble =
                document.createElement(
                    "div"
                );


            bubble.className =
                message.sender === "user"
                    ? "message user"
                    : "message kage";


            bubble.dataset.messageId =
                message.id;


            const text =
                document.createElement(
                    "div"
                );


            text.className =
                "messageText";


            text.textContent =
                message.text;


            bubble.appendChild(
                text
            );


            if (
                message.attachments &&
                message.attachments.length
            ) {

                renderMessageAttachments(
                    bubble,
                    message.attachments
                );

            }


            if (
                message.sender ===
                "user"
            ) {

                enableMessageControls(
                    bubble,
                    message
                );

            }


            messagesElement.appendChild(
                bubble
            );

        }
    );


    messagesElement.scrollTop =
        messagesElement.scrollHeight;

}


function renderMessageAttachments(
    bubble,
    attachments
) {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "messageAttachments";


    attachments.forEach(
        file => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "attachmentCard";


            if (
                file.type === "image" &&
                file.data
            ) {

                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    file.data;


                image.className =
                    "attachmentImage";


                card.appendChild(
                    image
                );

            } else {

                const icon =
                    document.createElement(
                        "span"
                    );


                icon.className =
                    "attachmentIcon";


                icon.textContent =
                    file.type === "video"
                        ? "🎥"
                        : "📄";


                card.appendChild(
                    icon
                );

            }


            const name =
                document.createElement(
                    "span"
                );


            name.className =
                "attachmentName";


            name.textContent =
                file.name;


            card.appendChild(
                name
            );


            container.appendChild(
                card
            );

        }
    );


    bubble.appendChild(
        container
    );

}


function enableMessageControls(
    bubble,
    message
) {

    let timer = null;


    bubble.addEventListener(
        "pointerdown",
        event => {

            if (
                event.pointerType ===
                "mouse"
            ) {
                return;
            }


            timer =
                setTimeout(
                    () => {

                        messageOptions(
                            message
                        );

                    },
                    650
                );

        }
    );


    const stop =
        () => {

            clearTimeout(
                timer
            );

        };


    bubble.addEventListener(
        "pointerup",
        stop
    );


    bubble.addEventListener(
        "pointercancel",
        stop
    );


    bubble.addEventListener(
        "pointerleave",
        stop
    );


    bubble.addEventListener(
        "contextmenu",
        event => {

            event.preventDefault();

            messageOptions(
                message
            );

        }
    );

}


async function messageOptions(
    message
) {

    const action =
        prompt(
            "type edit or copy"
        );


    if (
        action === "copy"
    ) {

        try {

            await navigator.clipboard.writeText(
                message.text
            );

        } catch {

            const area =
                document.createElement(
                    "textarea"
                );

            area.value =
                message.text;

            document.body.appendChild(
                area
            );

            area.select();

            document.execCommand(
                "copy"
            );

            area.remove();

        }

        return;

    }


    if (
        action === "edit"
    ) {

        const edited =
            prompt(
                "edit message",
                message.text
            );


        if (
            edited === null
        ) {
            return;
        }


        if (
            !edited.trim()
        ) {
            return;
        }


        updateMessage(
            message.id,
            edited.trim()
        );


        renderMessages();


        sendMessageToKage(
            edited.trim()
        );

    }

}


uploadButton.onclick =
    () => {

        fileInput.click();

    };


fileInput.onchange =
    async event => {

        const files =
            Array.from(
                event.target.files || []
            );


        selectedFiles =
            [];


        for (
            const file of files
        ) {

            const attachment =
                await convertFile(
                    file
                );


            selectedFiles.push(
                attachment
            );

        }


        renderAttachmentPreview();


        fileInput.value =
            "";

    };


function convertFile(file) {

    return new Promise(
        resolve => {

            const reader =
                new FileReader();


            const isImage =
                file.type.startsWith(
                    "image/"
                );


            const isVideo =
                file.type.startsWith(
                    "video/"
                );


            reader.onload =
                () => {

                    resolve({

                        name:
                            file.name,

                        type:
                            isImage
                                ? "image"
                                : isVideo
                                    ? "video"
                                    : "file",

                        mime:
                            file.type,

                        size:
                            file.size,

                        data:
                            reader.result

                    });

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


function renderAttachmentPreview() {

    attachmentPreview.innerHTML =
        "";


    if (
        selectedFiles.length ===
        0
    ) {

        attachmentPreview.classList.remove(
            "visible"
        );

        return;

    }


    attachmentPreview.classList.add(
        "visible"
    );


    selectedFiles.forEach(
        (file, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "previewItem";


            if (
                file.type === "image"
            ) {

                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    file.data;


                item.appendChild(
                    image
                );

            } else {

                const icon =
                    document.createElement(
                        "span"
                    );


                icon.textContent =
                    file.type === "video"
                        ? "🎥"
                        : "📄";


                item.appendChild(
                    icon
                );

            }


            const name =
                document.createElement(
                    "span"
                );


            name.textContent =
                file.name;


            item.appendChild(
                name
            );


            const remove =
                document.createElement(
                    "button"
                );


            remove.type =
                "button";


            remove.textContent =
                "×";


            remove.onclick =
                () => {

                    selectedFiles.splice(
                        index,
                        1
                    );

                    renderAttachmentPreview();

                };


            item.appendChild(
                remove
            );


            attachmentPreview.appendChild(
                item
            );

        }
    );

}


talkButton.onclick =
    async () => {

        const text =
            messageInput.value.trim();


        if (
            !text &&
            selectedFiles.length === 0
        ) {

            return;

        }


        const attachments =
            [...selectedFiles];


        let prompt =
            text;


        if (
            attachments.length
        ) {

            const names =
                attachments
                    .map(
                        file =>
                            file.name
                    )
                    .join(", ");


            prompt =
                text ||
                "please help me with these files";


            prompt +=
                `\n\nattached files: ${names}`;

        }


        addMessage(
            "user",
            text ||
            "attachment",
            attachments
        );


        messageInput.value =
            "";


        selectedFiles =
            [];


        renderAttachmentPreview();

        renderMessages();


        await sendMessageToKage(
            prompt
        );

    };


messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            talkButton.click();

        }

    }
);


async function sendMessageToKage(
    prompt
) {

    const loading =
        document.createElement(
            "div"
        );


    loading.className =
        "message kage";


    loading.textContent =
        "thinking...";


    messagesElement.appendChild(
        loading
    );


    messagesElement.scrollTop =
        messagesElement.scrollHeight;


    try {

        const response =
            await fetch(
                "/api/chat",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            prompt
                        })

                }
            );


        const result =
            await response.json();


        loading.remove();


        if (
            !response.ok
        ) {

            throw new Error(
                result.text ||
                "KAGE backend error"
            );

        }


        addMessage(
            "kage",
            result.text ||
            "no response"
        );


        renderMessages();


    } catch (
        error
    ) {

        loading.remove();


        console.log(
            "KAGE ERROR:",
            error
        );


        addMessage(
            "kage",
            "kage error: " +
            error.message
        );


        renderMessages();

    }

}


renderChats();

renderMessages();
