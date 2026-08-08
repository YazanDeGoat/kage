import {
    load,
    save
} from "./storage.js";

const STORAGE_KEY =
    "kage-chats";

let chats =
    load(
        STORAGE_KEY,
        []
    );

let activeChatId =
    null;

function saveChats() {

    save(
        STORAGE_KEY,
        chats
    );

}

function ensureChat() {

    if (
        chats.length === 0
    ) {

        createChat();

        return;

    }

    if (
        !activeChatId ||
        !chats.some(
            chat =>
                chat.id === activeChatId
        )
    ) {

        activeChatId =
            chats[0].id;

    }

}

ensureChat();

export function getChats() {

    return chats;

}

export function createChat() {

    const chat = {

        id:
            crypto.randomUUID(),

        title:
            "New Chat",

        created:
            Date.now(),

        messages:
            []

    };

    chats.unshift(chat);

    activeChatId =
        chat.id;

    saveChats();

    return chat;

}

export function setActiveChat(id) {

    const exists =
        chats.some(
            chat =>
                chat.id === id
        );

    if (!exists) {
        return false;
    }

    activeChatId =
        id;

    saveChats();

    return true;

}

export function getActiveChat() {

    ensureChat();

    return chats.find(
        chat =>
            chat.id === activeChatId
    ) || null;

}

export function getMessages() {

    const chat =
        getActiveChat();

    if (!chat) {
        return [];
    }

    return chat.messages;

}

export function addMessage(
    sender,
    text,
    attachments = []
) {

    const chat =
        getActiveChat();

    if (!chat) {
        return null;
    }

    const message = {

        id:
            crypto.randomUUID(),

        sender,

        text:
            String(text || ""),

        attachments:
            Array.isArray(attachments)
                ? attachments
                : [],

        time:
            Date.now()

    };

    chat.messages.push(
        message
    );

    if (
        sender === "user" &&
        chat.title === "New Chat" &&
        text.trim()
    ) {

        chat.title =
            createTitle(text);

    }

    saveChats();

    return message;

}

export function updateMessage(
    messageId,
    text
) {

    const chat =
        getActiveChat();

    if (!chat) {
        return false;
    }

    const message =
        chat.messages.find(
            item =>
                item.id === messageId
        );

    if (!message) {
        return false;
    }

    message.text =
        String(text || "");

    saveChats();

    return true;

}

export function renameChat(
    id,
    title
) {

    const chat =
        chats.find(
            item =>
                item.id === id
        );

    if (!chat) {
        return false;
    }

    const clean =
        String(title || "")
            .trim();

    if (!clean) {
        return false;
    }

    chat.title =
        clean;

    saveChats();

    return true;

}

export function deleteChat(id) {

    chats =
        chats.filter(
            chat =>
                chat.id !== id
        );

    if (
        chats.length === 0
    ) {

        createChat();

        return;

    }

    if (
        activeChatId === id
    ) {

        activeChatId =
            chats[0].id;

    }

    saveChats();

}

function createTitle(text) {

    return String(text)
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join(" ") || "New Chat";

}
