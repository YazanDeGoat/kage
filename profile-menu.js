"use strict";

(() => {
  const PROFILE_EVENT = "kage-profile-updated";

  let installPrompt = null;

  function svgDownload() {
    return `
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 3v12"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M5 21h14"></path>
      </svg>
    `;
  }

  function svgProfile() {
    return `
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="8" r="3"></circle>
        <path d="M5 20c.7-3.4 3-5.3 7-5.3s6.3 1.9 7 5.3"></path>
      </svg>
    `;
  }

  function svgClose() {
    return `
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 6l12 12"></path>
        <path d="M18 6 6 18"></path>
      </svg>
    `;
  }

  function addStyles() {
    if (document.getElementById("kage-profile-menu-css")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "kage-profile-menu-css";

    style.textContent = `
      #kage-header-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        margin-left: auto;
      }

      .kage-header-action {
        width: 38px !important;
        height: 38px !important;

        padding: 0 !important;
        margin: 0 !important;

        border: 0 !important;
        outline: 0 !important;

        background: transparent !important;

        color: inherit;

        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;

        cursor: pointer;

        border-radius: 8px !important;

        box-shadow: none !important;
      }

      .kage-header-action:hover {
        background: rgba(255,255,255,.06) !important;
      }

      .kage-header-action:active {
        transform: scale(.94);
      }

      .kage-header-action svg {
        display: block;
      }

      .kage-header-avatar {
        width: 28px;
        height: 28px;

        border-radius: 50%;

        object-fit: cover;

        display: block;
      }

      #kage-profile-panel,
      #kage-install-panel {
        position: fixed;

        top: 64px;
        right: 16px;

        width: min(350px, calc(100vw - 32px));

        background: #111;
        color: #fff;

        border: 1px solid rgba(255,255,255,.12);

        border-radius: 16px;

        padding: 18px;

        z-index: 999999;

        box-shadow: 0 24px 70px rgba(0,0,0,.55);

        display: none;
      }

      #kage-profile-panel.kage-visible,
      #kage-install-panel.kage-visible {
        display: block;
      }

      .kage-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        margin-bottom: 18px;
      }

      .kage-panel-title {
        font-size: 18px;
        font-weight: 700;
      }

      .kage-close {
        width: 34px;
        height: 34px;

        border: 0;
        border-radius: 8px;

        background: rgba(255,255,255,.07);
        color: #fff;

        display: flex;
        align-items: center;
        justify-content: center;

        cursor: pointer;
      }

      .kage-avatar-area {
        display: flex;
        flex-direction: column;
        align-items: center;

        gap: 12px;

        margin-bottom: 18px;
      }

      .kage-avatar-preview {
        width: 84px;
        height: 84px;

        border-radius: 50%;

        background: rgba(255,255,255,.07);

        display: flex;
        align-items: center;
        justify-content: center;

        overflow: hidden;
      }

      .kage-avatar-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .kage-profile-buttons {
        display: flex;
        gap: 8px;
      }

      .kage-small-button {
        border: 1px solid rgba(255,255,255,.12);

        border-radius: 9px;

        padding: 9px 12px;

        background: rgba(255,255,255,.06);
        color: #fff;

        cursor: pointer;
      }

      .kage-profile-field {
        margin-top: 12px;
      }

      .kage-profile-field label {
        display: block;

        font-size: 13px;

        opacity: .7;

        margin-bottom: 7px;
      }

      .kage-profile-field input {
        width: 100%;
        box-sizing: border-box;

        padding: 11px 12px;

        border: 1px solid rgba(255,255,255,.12);

        border-radius: 9px;

        background: rgba(255,255,255,.06);

        color: #fff;

        outline: none;
      }

      .kage-save-profile {
        width: 100%;

        margin-top: 16px;

        padding: 11px;

        border: 0;

        border-radius: 9px;

        background: #fff;

        color: #000;

        font-weight: 700;

        cursor: pointer;
      }

      .kage-install-text {
        font-size: 14px;
        line-height: 1.55;

        opacity: .82;

        margin-bottom: 15px;
      }

      .kage-install-button {
        width: 100%;

        padding: 11px;

        border: 0;

        border-radius: 9px;

        background: #fff;

        color: #000;

        font-weight: 700;

        cursor: pointer;
      }

      @media (max-width: 600px) {
        #kage-profile-panel,
        #kage-install-panel {
          top: 58px;
          right: 10px;

          width: calc(100vw - 20px);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function getProfile() {
    if (
      window.KAGEProfile &&
      typeof window.KAGEProfile.getProfile === "function"
    ) {
      return window.KAGEProfile.getProfile();
    }

    return {
      nickname: "",
      avatar: ""
    };
  }

  function findHeader() {
    const selectors = [
      "header",
      ".header",
      ".topBar",
      ".topbar",
      ".navbar",
      ".nav"
    ];

    for (const selector of selectors) {
      const element =
        document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    const headings =
      document.querySelectorAll(
        "h1,h2,h3"
      );

    for (const heading of headings) {
      if (
        heading.textContent.trim() === "KAGE"
      ) {
        return heading.parentElement;
      }
    }

    return null;
  }

  function createHeader() {
    if (
      document.getElementById(
        "kage-header-actions"
      )
    ) {
      return;
    }

    const header = findHeader();

    if (!header) {
      return;
    }

    const actions =
      document.createElement("div");

    actions.id =
      "kage-header-actions";

    actions.innerHTML = `
      <button
        id="kage-download-button"
        class="kage-header-action"
        type="button"
        aria-label="Install KAGE"
        title="Install KAGE"
      >
        ${svgDownload()}
      </button>

      <button
        id="kage-profile-button"
        class="kage-header-action"
        type="button"
        aria-label="Profile"
        title="Profile"
      >
        ${svgProfile()}
      </button>
    `;

    header.appendChild(actions);

    document
      .getElementById(
        "kage-download-button"
      )
      .addEventListener(
        "click",
        () => {
          if (
            window.KAGEInstall &&
            typeof window.KAGEInstall.open ===
              "function"
          ) {
            window.KAGEInstall.open();
          } else {
            openInstallPanel();
          }
        }
      );

    document
      .getElementById(
        "kage-profile-button"
      )
      .addEventListener(
        "click",
        openProfilePanel
      );

    updateHeaderAvatar();
  }

  function createProfilePanel() {
    if (
      document.getElementById(
        "kage-profile-panel"
      )
    ) {
      return;
    }

    const panel =
      document.createElement("div");

    panel.id =
      "kage-profile-panel";

    panel.innerHTML = `
      <div class="kage-panel-header">
        <div class="kage-panel-title">
          Profile
        </div>

        <button
          id="kage-profile-close"
          class="kage-close"
          type="button"
          aria-label="Close"
        >
          ${svgClose()}
        </button>
      </div>

      <div class="kage-avatar-area">

        <div
          id="kage-avatar-preview"
          class="kage-avatar-preview"
        >
          ${svgProfile()}
        </div>

        <div class="kage-profile-buttons">

          <button
            id="kage-avatar-change"
            class="kage-small-button"
            type="button"
          >
            Change picture
          </button>

          <button
            id="kage-avatar-remove"
            class="kage-small-button"
            type="button"
          >
            Remove
          </button>

        </div>

        <input
          id="kage-avatar-file"
          type="file"
          accept="image/*"
          hidden
        />

      </div>

      <div class="kage-profile-field">

        <label for="kage-nickname-input">
          Nickname
        </label>

        <input
          id="kage-nickname-input"
          type="text"
          maxlength="40"
          placeholder="What should KAGE call you?"
          autocomplete="nickname"
        />

      </div>

      <button
        id="kage-save-profile"
        class="kage-save-profile"
        type="button"
      >
        Save
      </button>
    `;

    document.body.appendChild(panel);

    document
      .getElementById(
        "kage-profile-close"
      )
      .addEventListener(
        "click",
        closeProfilePanel
      );

    document
      .getElementById(
        "kage-avatar-change"
      )
      .addEventListener(
        "click",
        () => {
          document
            .getElementById(
              "kage-avatar-file"
            )
            .click();
        }
      );

    document
      .getElementById(
        "kage-avatar-file"
      )
      .addEventListener(
        "change",
        handleAvatar
      );

    document
      .getElementById(
        "kage-avatar-remove"
      )
      .addEventListener(
        "click",
        removeAvatar
      );

    document
      .getElementById(
        "kage-save-profile"
      )
      .addEventListener(
        "click",
        saveProfile
      );
  }

  function createInstallPanel() {
    if (
      document.getElementById(
        "kage-install-panel"
      )
    ) {
      return;
    }

    const panel =
      document.createElement("div");

    panel.id =
      "kage-install-panel";

    panel.innerHTML = `
      <div class="kage-panel-header">

        <div class="kage-panel-title">
          Install KAGE
        </div>

        <button
          id="kage-install-close"
          class="kage-close"
          type="button"
          aria-label="Close"
        >
          ${svgClose()}
        </button>

      </div>

      <div
        id="kage-install-text"
        class="kage-install-text"
      ></div>

      <div id="kage-install-action"></div>
    `;

    document.body.appendChild(panel);

    document
      .getElementById(
        "kage-install-close"
      )
      .addEventListener(
        "click",
        closeInstallPanel
      );
  }

  function openProfilePanel() {
    createProfilePanel();

    const panel =
      document.getElementById(
        "kage-profile-panel"
      );

    const profile =
      getProfile();

    document
      .getElementById(
        "kage-nickname-input"
      )
      .value =
      profile.nickname || "";

    renderAvatar(
      profile.avatar || ""
    );

    panel.classList.add(
      "kage-visible"
    );
  }

  function closeProfilePanel() {
    const panel =
      document.getElementById(
        "kage-profile-panel"
      );

    if (panel) {
      panel.classList.remove(
        "kage-visible"
      );
    }
  }

  function handleAvatar(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        window.KAGEProfile &&
        typeof window.KAGEProfile.setAvatar ===
          "function"
      ) {
        window.KAGEProfile.setAvatar(
          reader.result
        );
      }

      renderAvatar(
        reader.result
      );

      updateHeaderAvatar();
    };

    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    if (
      window.KAGEProfile &&
      typeof window.KAGEProfile.removeAvatar ===
        "function"
    ) {
      window.KAGEProfile.removeAvatar();
    }

    renderAvatar("");

    updateHeaderAvatar();
  }

  function saveProfile() {
    const input =
      document.getElementById(
        "kage-nickname-input"
      );

    const nickname =
      input
        ? input.value.trim()
        : "";

    if (
      window.KAGEProfile &&
      typeof window.KAGEProfile.setNickname ===
        "function"
    ) {
      window.KAGEProfile.setNickname(
        nickname
      );
    }

    updateHeaderAvatar();

    closeProfilePanel();
  }

  function renderAvatar(avatar) {
    const preview =
      document.getElementById(
        "kage-avatar-preview"
      );

    if (!preview) {
      return;
    }

    if (avatar) {
      preview.innerHTML = `
        <img
          src="${avatar}"
          alt="Profile picture"
        />
      `;
    } else {
      preview.innerHTML =
        svgProfile();
    }
  }

  function updateHeaderAvatar() {
    const button =
      document.getElementById(
        "kage-profile-button"
      );

    if (!button) {
      return;
    }

    const profile =
      getProfile();

    if (profile.avatar) {
      button.innerHTML = `
        <img
          class="kage-header-avatar"
          src="${profile.avatar}"
          alt="Profile"
        />
      `;
    } else {
      button.innerHTML =
        svgProfile();
    }
  }

  function isIOS() {
    return (
      /iPad|iPhone|iPod/i.test(
        navigator.userAgent
      ) ||
      (
        navigator.platform ===
          "MacIntel" &&
        navigator.maxTouchPoints > 1
      )
    );
  }

  function isInstalled() {
    return (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      window.navigator.standalone === true
    );
  }

  async function openInstallPanel() {
    createInstallPanel();

    const panel =
      document.getElementById(
        "kage-install-panel"
      );

    const text =
      document.getElementById(
        "kage-install-text"
      );

    const action =
      document.getElementById(
        "kage-install-action"
      );

    action.innerHTML = "";

    if (isInstalled()) {
      text.textContent =
        "KAGE is already installed on this device.";

      panel.classList.add(
        "kage-visible"
      );

      return;
    }

    if (installPrompt) {
      text.textContent =
        "Install KAGE as an app on this device.";

      const button =
        document.createElement(
          "button"
        );

      button.className =
        "kage-install-button";

      button.textContent =
        "Install";

      button.addEventListener(
        "click",
        triggerInstall
      );

      action.appendChild(
        button
      );

      panel.classList.add(
        "kage-visible"
      );

      return;
    }

    if (isIOS()) {
      text.innerHTML =
        "Open the browser Share menu and choose <strong>Add to Home Screen</strong>.";

      panel.classList.add(
        "kage-visible"
      );

      return;
    }

    text.innerHTML =
      "Use your browser's <strong>Install KAGE</strong> or <strong>Add to Home Screen</strong> option.";

    panel.classList.add(
      "kage-visible"
    );
  }

  async function triggerInstall() {
    if (!installPrompt) {
      return;
    }

    const prompt =
      installPrompt;

    installPrompt = null;

    try {
      await prompt.prompt();

      await prompt.userChoice;
    } catch (error) {
      console.warn(
        "KAGE install prompt failed:",
        error
      );
    }

    closeInstallPanel();
  }

  function closeInstallPanel() {
    const panel =
      document.getElementById(
        "kage-install-panel"
      );

    if (panel) {
      panel.classList.remove(
        "kage-visible"
      );
    }
  }

  window.addEventListener(
    "beforeinstallprompt",
    event => {
      event.preventDefault();

      installPrompt = event;
    }
  );

  window.addEventListener(
    PROFILE_EVENT,
    updateHeaderAvatar
  );

  function mount() {
    addStyles();

    createHeader();
    createProfilePanel();
    createInstallPanel();

    updateHeaderAvatar();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      mount,
      { once: true }
    );
  } else {
    mount();
  }

  window.KAGEProfileMenu = {
    openProfile: openProfilePanel,
    openInstall: openInstallPanel,
    updateHeaderAvatar
  };
})();
