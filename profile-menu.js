/*
 * KAGE Profile UI
 * Phase 20
 *
 * Self-mounting profile button/menu.
 * Stores profile data locally so it survives refreshes/reopens.
 */

(() => {
  "use strict";

  const PROFILE_STORAGE_KEY = "kage_profile";

  const DEFAULT_PROFILE = {
    nickname: "",
    avatar: ""
  };

  function loadProfile() {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);

      if (!saved) {
        return { ...DEFAULT_PROFILE };
      }

      const parsed = JSON.parse(saved);

      return {
        nickname:
          typeof parsed.nickname === "string"
            ? parsed.nickname
            : "",
        avatar:
          typeof parsed.avatar === "string"
            ? parsed.avatar
            : ""
      };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  function saveProfile(profile) {
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(profile)
    );

    window.KAGE_PROFILE = {
      ...profile
    };

    window.dispatchEvent(
      new CustomEvent("kage:profile-updated", {
        detail: {
          ...profile
        }
      })
    );
  }

  function publishProfile() {
    const profile = loadProfile();

    window.KAGE_PROFILE = {
      ...profile
    };

    window.dispatchEvent(
      new CustomEvent("kage:profile-ready", {
        detail: {
          ...profile
        }
      })
    );

    return profile;
  }

  function findHeader() {
    const selectors = [
      "header",
      ".header",
      ".topbar",
      ".top-bar",
      ".navbar",
      ".nav",
      ".chatHeader",
      ".chat-header",
      ".topHeader",
      ".top-header"
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function createStyles() {
    if (document.getElementById("kage-profile-ui-style")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "kage-profile-ui-style";

    style.textContent = `
      .kage-profile-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
        position: relative;
        z-index: 1000;
      }

      .kage-profile-button,
      .kage-download-button {
        appearance: none;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.055);
        color: #fff;
        border-radius: 10px;
        height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
          background .18s ease,
          border-color .18s ease,
          transform .18s ease;
      }

      .kage-profile-button {
        padding: 0 12px;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
      }

      .kage-download-button {
        width: 40px;
        min-width: 40px;
      }

      .kage-profile-button:hover,
      .kage-download-button:hover {
        background: rgba(255,255,255,.10);
        border-color: rgba(255,255,255,.20);
      }

      .kage-profile-button:active,
      .kage-download-button:active {
        transform: scale(.96);
      }

      .kage-download-button svg {
        width: 21px;
        height: 21px;
        stroke: currentColor;
      }

      .kage-profile-avatar {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        object-fit: cover;
        display: block;
        background: rgba(255,255,255,.12);
      }

      .kage-profile-avatar-default {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,.12);
        color: rgba(255,255,255,.8);
        font-size: 14px;
        font-weight: 700;
      }

      .kage-profile-menu {
        position: fixed;
        top: 62px;
        right: 16px;
        width: min(340px, calc(100vw - 32px));
        background: #111214;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 16px;
        box-shadow: 0 18px 60px rgba(0,0,0,.45);
        padding: 18px;
        z-index: 99999;
        color: #fff;
      }

      .kage-profile-menu[hidden] {
        display: none;
      }

      .kage-profile-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 16px;
      }

      .kage-profile-section {
        margin-bottom: 18px;
      }

      .kage-profile-label {
        display: block;
        font-size: 13px;
        color: rgba(255,255,255,.62);
        margin-bottom: 8px;
      }

      .kage-profile-input {
        width: 100%;
        box-sizing: border-box;
        min-height: 44px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.13);
        background: rgba(255,255,255,.055);
        color: #fff;
        padding: 0 12px;
        font-size: 16px;
        outline: none;
      }

      .kage-profile-input:focus {
        border-color: rgba(255,255,255,.35);
      }

      .kage-avatar-editor {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .kage-large-avatar,
      .kage-large-avatar-default {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        flex: 0 0 64px;
      }

      .kage-large-avatar {
        object-fit: cover;
      }

      .kage-large-avatar-default {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,.10);
        font-size: 24px;
        font-weight: 700;
      }

      .kage-profile-actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .kage-profile-action {
        appearance: none;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.06);
        color: #fff;
        border-radius: 9px;
        min-height: 40px;
        padding: 0 12px;
        cursor: pointer;
        font-size: 14px;
      }

      .kage-profile-action.primary {
        background: #fff;
        color: #111;
        border-color: #fff;
        font-weight: 700;
      }

      .kage-profile-action:hover {
        background: rgba(255,255,255,.11);
      }

      .kage-profile-action.primary:hover {
        background: #e9e9e9;
      }

      .kage-profile-status {
        margin-top: 10px;
        font-size: 12px;
        color: rgba(255,255,255,.55);
        min-height: 16px;
      }

      @media (max-width: 600px) {
        .kage-profile-actions {
          gap: 6px;
        }

        .kage-profile-button {
          padding: 0 9px;
        }

        .kage-profile-menu {
          top: 58px;
          right: 10px;
          width: calc(100vw - 20px);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function avatarMarkup(profile, large = false) {
    if (profile.avatar) {
      return `
        <img
          class="${large ? "kage-large-avatar" : "kage-profile-avatar"}"
          src="${profile.avatar}"
          alt="Profile picture"
        >
      `;
    }

    return `
      <span class="${
        large
          ? "kage-large-avatar-default"
          : "kage-profile-avatar-default"
      }">
        ${profile.nickname
          ? profile.nickname.charAt(0).toUpperCase()
          : "K"}
      </span>
    `;
  }

  function createDownloadIcon() {
    return `
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M5 21h14"></path>
      </svg>
    `;
  }

  function createUI() {
    if (document.getElementById("kage-profile-actions")) {
      return;
    }

    const profile = loadProfile();

    const actions = document.createElement("div");

    actions.id = "kage-profile-actions";

    actions.className = "kage-profile-actions";

    actions.innerHTML = `
      <button
        id="kage-download-button"
        class="kage-download-button"
        type="button"
        aria-label="Install KAGE"
        title="Install KAGE"
      >
        ${createDownloadIcon()}
      </button>

      <button
        id="kage-profile-button"
        class="kage-profile-button"
        type="button"
        aria-label="Open profile"
        aria-expanded="false"
      >
        ${avatarMarkup(profile)}
        <span>Profile</span>
      </button>
    `;

    const menu = document.createElement("div");

    menu.id = "kage-profile-menu";

    menu.className = "kage-profile-menu";

    menu.hidden = true;

    menu.innerHTML = `
      <div class="kage-profile-title">
        Profile
      </div>

      <div class="kage-profile-section">
        <span class="kage-profile-label">
          Profile picture
        </span>

        <div class="kage-avatar-editor">
          <div id="kage-profile-large-avatar">
            ${avatarMarkup(profile, true)}
          </div>

          <div class="kage-profile-actions-row">
            <button
              id="kage-avatar-upload"
              class="kage-profile-action"
              type="button"
            >
              Edit Profile Picture
            </button>

            <button
              id="kage-avatar-remove"
              class="kage-profile-action"
              type="button"
            >
              Remove
            </button>
          </div>
        </div>

        <input
          id="kage-avatar-input"
          type="file"
          accept="image/*"
          hidden
        >
      </div>

      <div class="kage-profile-section">
        <label
          class="kage-profile-label"
          for="kage-nickname-input"
        >
          Nickname
        </label>

        <input
          id="kage-nickname-input"
          class="kage-profile-input"
          type="text"
          maxlength="40"
          autocomplete="nickname"
          placeholder="What should KAGE call you?"
        >
      </div>

      <div class="kage-profile-actions-row">
        <button
          id="kage-profile-save"
          class="kage-profile-action primary"
          type="button"
        >
          Save Profile
        </button>

        <button
          id="kage-profile-close"
          class="kage-profile-action"
          type="button"
        >
          Close
        </button>
      </div>

      <div
        id="kage-profile-status"
        class="kage-profile-status"
        aria-live="polite"
      ></div>
    `;

    const header = findHeader();

    if (header) {
      header.appendChild(actions);
    } else {
      actions.style.position = "fixed";
      actions.style.top = "12px";
      actions.style.right = "12px";
      actions.style.zIndex = "99999";

      document.body.appendChild(actions);
    }

    document.body.appendChild(menu);

    wireEvents(actions, menu);
  }

  function updateUI(profile) {
    const profileButton = document.getElementById(
      "kage-profile-button"
    );

    const largeAvatar = document.getElementById(
      "kage-profile-large-avatar"
    );

    const nicknameInput = document.getElementById(
      "kage-nickname-input"
    );

    if (profileButton) {
      profileButton.innerHTML = `
        ${avatarMarkup(profile)}
        <span>Profile</span>
      `;
    }

    if (largeAvatar) {
      largeAvatar.innerHTML = avatarMarkup(profile, true);
    }

    if (nicknameInput) {
      nicknameInput.value = profile.nickname || "";
    }
  }

  function setStatus(message) {
    const status = document.getElementById(
      "kage-profile-status"
    );

    if (status) {
      status.textContent = message;
    }
  }

  function wireEvents(actions, menu) {
    const profileButton = document.getElementById(
      "kage-profile-button"
    );

    const downloadButton = document.getElementById(
      "kage-download-button"
    );

    const uploadButton = document.getElementById(
      "kage-avatar-upload"
    );

    const removeButton = document.getElementById(
      "kage-avatar-remove"
    );

    const avatarInput = document.getElementById(
      "kage-avatar-input"
    );

    const saveButton = document.getElementById(
      "kage-profile-save"
    );

    const closeButton = document.getElementById(
      "kage-profile-close"
    );

    const nicknameInput = document.getElementById(
      "kage-nickname-input"
    );

    profileButton.addEventListener("click", () => {
      const opening = menu.hidden;

      menu.hidden = !opening;

      profileButton.setAttribute(
        "aria-expanded",
        String(opening)
      );

      if (opening) {
        updateUI(loadProfile());

        setTimeout(() => {
          nicknameInput?.focus();
        }, 0);
      }
    });

    closeButton.addEventListener("click", () => {
      menu.hidden = true;

      profileButton.setAttribute(
        "aria-expanded",
        "false"
      );
    });

    document.addEventListener("click", event => {
      if (
        menu.hidden ||
        menu.contains(event.target) ||
        actions.contains(event.target)
      ) {
        return;
      }

      menu.hidden = true;

      profileButton.setAttribute(
        "aria-expanded",
        "false"
      );
    });

    uploadButton.addEventListener("click", () => {
      avatarInput.click();
    });

    avatarInput.addEventListener("change", event => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setStatus("Please choose an image file.");

        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const profile = loadProfile();

        profile.avatar = String(reader.result || "");

        saveProfile(profile);

        updateUI(profile);

        setStatus("Profile picture selected.");

        avatarInput.value = "";
      };

      reader.onerror = () => {
        setStatus("The image could not be loaded.");
      };

      reader.readAsDataURL(file);
    });

    removeButton.addEventListener("click", () => {
      const profile = loadProfile();

      profile.avatar = "";

      saveProfile(profile);

      updateUI(profile);

      setStatus("Profile picture removed.");
    });

    saveButton.addEventListener("click", () => {
      const profile = loadProfile();

      const nickname = nicknameInput.value
        .trim()
        .replace(/\s+/g, " ");

      profile.nickname = nickname.slice(0, 40);

      saveProfile(profile);

      updateUI(profile);

      setStatus(
        profile.nickname
          ? `Saved. KAGE can call you ${profile.nickname}.`
          : "Profile saved."
      );
    });

    nicknameInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();

        saveButton.click();
      }
    });

    downloadButton.addEventListener("click", () => {
      if (
        window.KAGEInstall &&
        typeof window.KAGEInstall.open === "function"
      ) {
        window.KAGEInstall.open();

        return;
      }

      window.dispatchEvent(
        new CustomEvent("kage:install-requested")
      );
    });

    window.addEventListener(
      "kage:profile-updated",
      event => {
        if (event.detail) {
          updateUI(event.detail);
        }
      }
    );
  }

  function initialize() {
    publishProfile();

    createStyles();

    createUI();

    updateUI(loadProfile());
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
