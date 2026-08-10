/*
 * KAGE Profile + Install Header
 *
 * Header appearance:
 *   [ download icon ] [ profile icon ]
 *
 * No text buttons.
 * No pill buttons.
 * No decorative circles.
 *
 * Profile data comes from kage-profile.js.
 */

(() => {
  "use strict";

  let installPrompt = null;

  const PROFILE_EVENT = "kage-profile-updated";

  function downloadIcon() {
    return `
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v11"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M5 21h14"></path>
      </svg>
    `;
  }

  function profileIcon() {
    return `
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3.2"></circle>
        <path d="M5 20c.8-3.4 3.1-5.4 7-5.4s6.2 2 7 5.4"></path>
      </svg>
    `;
  }

  function closeIcon() {
    return `
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12"></path>
        <path d="M18 6 6 18"></path>
      </svg>
    `;
  }

  function injectStyles() {
    if (document.getElementById("kage-profile-menu-style")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "kage-profile-menu-style";

    style.textContent = `
      /*
       * HEADER ICONS
       */

      #kage-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
      }

      .kage-header-icon {
        appearance: none;
        -webkit-appearance: none;

        width: 38px;
        height: 38px;

        padding: 0;
        margin: 0;

        border: 0;
        outline: 0;
        background: transparent;

        color: inherit;

        display: inline-flex;
        align-items: center;
        justify-content: center;

        cursor: pointer;

        border-radius: 10px;

        box-shadow: none;
      }

      .kage-header-icon:hover {
        background: rgba(255,255,255,.06);
      }

      .kage-header-icon:active {
        transform: scale(.94);
      }

      .kage-header-icon svg {
        display: block;
      }

      .kage-header-avatar {
        width: 30px;
        height: 30px;

        border-radius: 50%;

        object-fit: cover;

        display: block;
      }

      /*
       * PROFILE PANEL
       */

      #kage-profile-panel {
        position: fixed;

        top: 70px;
        right: 18px;

        width: min(340px, calc(100vw - 36px));

        background: #111;
        color: #fff;

        border: 1px solid rgba(255,255,255,.12);
        border-radius: 18px;

        padding: 18px;

        z-index: 999999;

        box-shadow:
          0 24px 70px rgba(0,0,0,.55);

        display: none;
      }

      #kage-profile-panel.kage-open {
        display: block;
      }

      .kage-profile-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;

        margin-bottom: 18px;
      }

      .kage-profile-title {
        font-size: 18px;
        font-weight: 700;
      }

      .kage-profile-close {
        width: 34px;
        height: 34px;

        padding: 0;

        border: 0;
        border-radius: 9px;

        background: rgba(255,255,255,.07);
        color: #fff;

        display: flex;
        align-items: center;
        justify-content: center;

        cursor: pointer;
      }

      .kage-profile-avatar-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;

        margin-bottom: 18px;
      }

      .kage-profile-avatar {
        width: 82px;
        height: 82px;

        border-radius: 50%;

        background: rgba(255,255,255,.07);

        display: flex;
        align-items: center;
        justify-content: center;

        overflow: hidden;
      }

      .kage-profile-avatar img {
        width: 100%;
        height: 100%;

        object-fit: cover;
      }

      .kage-profile-actions {
        display: flex;
        gap: 8px;
      }

      .kage-profile-action {
        padding: 9px 12px;

        border: 1px solid rgba(255,255,255,.12);
        border-radius: 10px;

        background: rgba(255,255,255,.06);
        color: #fff;

        cursor: pointer;
      }

      .kage-profile-field {
        margin-top: 14px;
      }

      .kage-profile-field label {
        display: block;

        margin-bottom: 7px;

        font-size: 13px;
        opacity: .7;
      }

      .kage-profile-field input {
        width: 100%;
        box-sizing: border-box;

        padding: 11px 12px;

        border: 1px solid rgba(255,255,255,.12);
        border-radius: 10px;

        background: rgba(255,255,255,.06);
        color: #fff;

        outline: none;
      }

      .kage-profile-save {
        width: 100%;

        margin-top: 16px;

        padding: 11px;

        border: 0;
        border-radius: 10px;

        background: #fff;
        color: #000;

        font-weight: 700;

        cursor: pointer;
      }

      /*
       * INSTALL PANEL
       */

      #kage-install-panel {
        position: fixed;

        top: 70px;
        right: 18px;

        width: min(340px, calc(100vw - 36px));

        background: #111;
        color: #fff;

        border: 1px solid rgba(255,255,255,.12);
        border-radius: 18px;

        padding: 18px;

        z-index: 999999;

        box-shadow:
          0 24px 70px rgba(0,0,0,.55);

        display: none;
      }

      #kage-install-panel.kage-open {
        display: block;
      }

      .kage-install-message {
        font-size: 14px;
        line-height: 1.55;

        opacity: .82;

        margin-bottom: 14px;
      }

      .kage-install-now {
        width: 100%;

        padding: 11px;

        border: 0;
        border-radius: 10px;

        background: #fff;
        color: #000;

        font-weight: 700;

        cursor: pointer;
      }

      @media (max-width: 600px) {
        #kage-profile-panel,
        #kage-install-panel {
          top: 62px;
          right: 10px;
          width: calc(100vw - 20px);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function findHeader() {
    const candidates = [
      "header",
      ".header",
      ".topBar",
      ".topbar",
      ".navbar",
      ".nav",
      ".sidebar-header",
      ".sidebarHeader"
    ];

    for (const selector of candidates) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    /*
     * Fallback:
     * Find the element containing the KAGE title.
     */
    const elements = document.querySelectorAll(
      "h1, h2, h3, div, span"
    );

    for (const element of elements) {
      if (
        element.textContent.trim() === "KAGE" &&
        element.children.length === 0
      ) {
        return element.parentElement;
      }
    }

    return null;
  }

  function createHeaderActions() {
    if (document.getElementById("kage-header-actions")) {
      return;
    }

    injectStyles();

    const header = findHeader();

    if (!header) {
      return;
    }

    const actions = document.createElement("div");

    actions.id = "kage-header-actions";

    actions.innerHTML = `
      <button
        id="kage-download-icon"
        class="kage-header-icon"
        type="button"
        aria-label="Install KAGE"
        title="Install KAGE"
      >
        ${downloadIcon()}
      </button>

      <button
        id="kage-profile-icon"
        class="kage-header-icon"
        type="button"
        aria-label="Profile"
        title="Profile"
      >
        ${profileIcon()}
      </button>
    `;

    header.appendChild(actions);

    document
      .getElementById("kage-download-icon")
      .addEventListener(
        "click",
        openInstall
      );

    document
      .getElementById("kage-profile-icon")
      .addEventListener(
        "click",
        toggleProfile
      );

    updateProfileButton();
  }

  function createProfilePanel() {
    if (document.getElementById("kage-profile-panel")) {
      return;
    }

    const panel = document.createElement("div");

    panel.id = "kage-profile-panel";

    panel.innerHTML = `
      <div class="kage-profile-heading">
        <div class="kage-profile-title">
          Profile
        </div>

        <button
          id="kage-profile-close"
          class="kage-profile-close"
          type="button"
          aria-label="Close profile"
        >
          ${closeIcon()}
        </button>
      </div>

      <div class="kage-profile-avatar-wrap">

        <div
          id="kage-profile-avatar"
          class="kage-profile-avatar"
        >
          ${profileIcon()}
        </div>

        <div class="kage-profile-actions">

          <button
            id="kage-change-avatar"
            class="kage-profile-action"
            type="button"
          >
            Change picture
          </button>

          <button
            id="kage-remove-avatar"
            class="kage-profile-action"
            type="button"
          >
            Remove
          </button>

        </div>

        <input
          id="kage-avatar-input"
          type="file"
          accept="image/*"
          hidden
        />

      </div>

      <div class="kage-profile-field">

        <label for="kage-nickname">
          Nickname
        </label>

        <input
          id="kage-nickname"
          type="text"
          maxlength="40"
          autocomplete="nickname"
          placeholder="What should KAGE call you?"
        />

      </div>

      <button
        id="kage-save-profile"
        class="kage-profile-save"
        type="button"
      >
        Save
      </button>
    `;

    document.body.appendChild(panel);

    document
      .getElementById("kage-profile-close")
      .addEventListener(
        "click",
        closeProfile
      );

    document
      .getElementById("kage-change-avatar")
      .addEventListener(
        "click",
        () => {
          document
            .getElementById("kage-avatar-input")
            .click();
        }
      );

    document
      .getElementById("kage-avatar-input")
      .addEventListener(
        "change",
        handleAvatar
      );

    document
      .getElementById("kage-remove-avatar")
      .addEventListener(
        "click",
        removeAvatar
      );

    document
      .getElementById("kage-save-profile")
      .addEventListener(
        "click",
        saveProfile
      );
  }

  function createInstallPanel() {
    if (document.getElementById("kage-install-panel")) {
      return;
    }

    const panel = document.createElement("div");

    panel.id = "kage-install-panel";

    panel.innerHTML = `
      <div class="kage-profile-heading">

        <div class="kage-profile-title">
          KAGE
        </div>

        <button
          id="kage-install-close"
          class="kage-profile-close"
          type="button"
          aria-label="Close"
        >
          ${closeIcon()}
        </button>

      </div>

      <div
        id="kage-install-message"
        class="kage-install-message"
      ></div>

      <div id="kage-install-action"></div>
    `;

    document.body.appendChild(panel);

    document
      .getElementById("kage-install-close")
      .addEventListener(
        "click",
        closeInstall
      );
  }

  function getProfile() {
    if (
      window.KAGEProfile &&
      typeof window.KAGEProfile.getProfile === "function"
    ) {
      return window.KAGEProfile.getProfile();
    }

    try {
      return JSON.parse(
        localStorage.getItem("kage_profile") || "{}"
      );
    } catch {
      return {};
    }
  }

  function saveNickname(nickname) {
    if (
      window.KAGEProfile &&
      typeof window.KAGEProfile.setNickname === "function"
    ) {
      return window.KAGEProfile.setNickname(
        nickname
      );
    }

    const profile = getProfile();

    profile.nickname = nickname;

    localStorage.setItem(
      "kage_profile",
      JSON.stringify(profile)
    );

    return profile;
  }

  function saveAvatar(avatar) {
    if (
      window.KAGEProfile &&
      typeof window.KAGEProfile.setAvatar === "function"
    ) {
      return window.KAGEProfile.setAvatar(
        avatar
      );
    }

    const profile = getProfile();

    profile.avatar = avatar;

    localStorage.setItem(
      "kage_profile",
      JSON.stringify(profile)
    );

    return profile;
  }

  function deleteAvatar() {
    if (
      window.KAGEProfile &&
      typeof window.KAGEProfile.removeAvatar === "function"
    ) {
      return window.KAGEProfile.removeAvatar();
    }

    return saveAvatar("");
  }

  function updateProfileButton() {
    const button =
      document.getElementById(
        "kage-profile-icon"
      );

    if (!button) {
      return;
    }

    const profile = getProfile();

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
        profileIcon();
    }
  }

  function populateProfile() {
    const profile = getProfile();

    const nickname =
      document.getElementById(
        "kage-nickname"
      );

    if (nickname) {
      nickname.value =
        profile.nickname || "";
    }

    renderAvatar(
      profile.avatar || ""
    );
  }

  function renderAvatar(avatar) {
    const element =
      document.getElementById(
        "kage-profile-avatar"
      );

    if (!element) {
      return;
    }

    if (avatar) {
      element.innerHTML = `
        <img
          src="${avatar}"
          alt="Profile picture"
        />
      `;
    } else {
      element.innerHTML =
        profileIcon();
    }

    updateProfileButton();
  }

  function handleAvatar(event) {
    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      saveAvatar(
        reader.result
      );

      renderAvatar(
        reader.result
      );
    };

    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    deleteAvatar();

    renderAvatar("");
  }

  function saveProfile() {
    const input =
      document.getElementById(
        "kage-nickname"
      );

    const nickname =
      input
        ? input.value.trim()
        : "";

    saveNickname(nickname);

    updateProfileButton();

    /*
     * Tell KAGE's orchestration layer that
     * the identity changed.
     */
    window.dispatchEvent(
      new CustomEvent(
        "kage-identity-updated",
        {
          detail: {
            nickname,
            profile: getProfile()
          }
        }
      )
    );

    closeProfile();
  }

  function toggleProfile() {
    const panel =
      document.getElementById(
        "kage-profile-panel"
      );

    if (!panel) {
      return;
    }

    populateProfile();

    panel.classList.toggle(
      "kage-open"
    );
  }

  function closeProfile() {
    const panel =
      document.getElementById(
        "kage-profile-panel"
      );

    if (panel) {
      panel.classList.remove(
        "kage-open"
      );
    }
  }

  function isStandalone() {
    return (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      window.navigator.standalone === true
    );
  }

  /*
   * Chromium/Android/desktop install event.
   */
  window.addEventListener(
    "beforeinstallprompt",
    event => {
      event.preventDefault();

      installPrompt = event;
    }
  );

  /*
   * Give the existing KAGE install controller
   * the first opportunity to handle installation.
   */
  function requestExistingInstallController() {
    const events = [
      "kage-install-request",
      "kage:install-request"
    ];

    for (const eventName of events) {
      window.dispatchEvent(
        new CustomEvent(eventName)
      );
    }

    if (
      window.KAGEInstall &&
      typeof window.KAGEInstall.install === "function"
    ) {
      return window.KAGEInstall.install();
    }

    if (
      window.KAGEInstall &&
      typeof window.KAGEInstall.prompt === "function"
    ) {
      return window.KAGEInstall.prompt();
    }

    return false;
  }

  async function openInstall() {
    const panel =
      document.getElementById(
        "kage-install-panel"
      );

    const message =
      document.getElementById(
        "kage-install-message"
      );

    const action =
      document.getElementById(
        "kage-install-action"
      );

    if (!panel || !message || !action) {
      return;
    }

    action.innerHTML = "";

    /*
     * Already installed.
     */
    if (isStandalone()) {
      message.textContent =
        "KAGE is already installed on this device.";

      panel.classList.add(
        "kage-open"
      );

      return;
    }

    /*
     * Chromium install prompt.
     */
    if (installPrompt) {
      message.textContent =
        "Install KAGE as an app on this device.";

      const button =
        document.createElement("button");

      button.className =
        "kage-install-now";

      button.textContent =
        "Install KAGE";

      button.addEventListener(
        "click",
        installNow
      );

      action.appendChild(button);

      panel.classList.add(
        "kage-open"
      );

      return;
    }

    /*
     * Let the existing controller handle
     * anything it already knows how to handle.
     */
    requestExistingInstallController();

    /*
     * iPhone / iPad.
     */
    const ios =
      /iPad|iPhone|iPod/i.test(
        navigator.userAgent
      ) ||
      (
        navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1
      );

    if (ios) {
      message.innerHTML =
        "Use your browser's Share menu, then choose <strong>Add to Home Screen</strong>.";

      panel.classList.add(
        "kage-open"
      );

      return;
    }

    /*
     * Other browsers.
     */
    message.innerHTML =
      "Use your browser's <strong>Install KAGE</strong> or <strong>Add to Home Screen</strong> option.";

    panel.classList.add(
      "kage-open"
    );
  }

  async function installNow() {
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
        "KAGE installation prompt failed:",
        error
      );
    }

    closeInstall();
  }

  function closeInstall() {
    const panel =
      document.getElementById(
        "kage-install-panel"
      );

    if (panel) {
      panel.classList.remove(
        "kage-open"
      );
    }
  }

  function mount() {
    injectStyles();

    createHeaderActions();
    createProfilePanel();
    createInstallPanel();

    updateProfileButton();
  }

  window.addEventListener(
    PROFILE_EVENT,
    updateProfileButton
  );

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      mount,
      { once: true }
    );
  } else {
    mount();
  }

  /*
   * Public API for KAGE.
   */
  window.KAGEProfileMenu = {
    openProfile: toggleProfile,
    openInstall,
    updateProfileButton
  };
})();
