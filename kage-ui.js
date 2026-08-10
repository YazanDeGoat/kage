/*
 * KAGE UI Integration
 *
 * Responsibilities:
 * - Visible Profile control
 * - Persistent nickname
 * - Persistent avatar
 * - Avatar upload/remove
 * - KAGE profile state exposure
 * - Visible PWA install control
 * - Chromium install prompt
 * - iOS/iPadOS install instructions
 * - Already-installed state
 *
 * Does NOT replace KAGE chat, streaming, dispatcher,
 * orchestrator, memory, search, attachments, voice,
 * image, video, or provider systems.
 */
const PROFILE_STORAGE_KEY = "kage.profile";
const INSTALL_EVENT_NAME = "kage:install";
let deferredInstallPrompt = null;
const DEFAULT_PROFILE = {
  nickname: "",
  avatar: ""
};
/* ---------------------------------------------------------
   PROFILE STORAGE
--------------------------------------------------------- */
function readProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PROFILE };
    }
    const parsed = JSON.parse(raw);
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
  const cleanProfile = {
    nickname:
      typeof profile.nickname === "string"
        ? profile.nickname.trim().slice(0, 40)
        : "",
    avatar:
      typeof profile.avatar === "string"
        ? profile.avatar
        : ""
  };
  localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify(cleanProfile)
  );
  exposeProfileToKage(cleanProfile);
  window.dispatchEvent(
    new CustomEvent("kage:profile-updated", {
      detail: cleanProfile
    })
  );
  return cleanProfile;
}
/*
 * Makes the current identity available to KAGE without
 * replacing the dispatcher/orchestrator.
 *
 * Existing KAGE systems can read:
 * window.KAGE_PROFILE
 *
 * or:
 * localStorage.getItem("kage.profile")
 */
function exposeProfileToKage(profile = readProfile()) {
  window.KAGE_PROFILE = Object.freeze({
    nickname: profile.nickname || "",
    avatar: profile.avatar || ""
  });
  window.KAGE_IDENTITY = window.KAGE_PROFILE;
}
/* ---------------------------------------------------------
   INSTALL DETECTION
--------------------------------------------------------- */
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButton();
});
function isStandalone() {
  return (
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches
  ) ||
  window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(
    window.navigator.userAgent
  );
}
function isSafari() {
  return (
    /safari/i.test(window.navigator.userAgent) &&
    !/chrome|android|crios|fxios|edgios/i.test(
      window.navigator.userAgent
    )
  );
}
function isIOSInstallEnvironment() {
  return isIOS() && isSafari();
}
/* ---------------------------------------------------------
   INSTALL UI
--------------------------------------------------------- */
function showInstallExperience() {
  const modal = document.getElementById(
    "kage-install-modal"
  );
  if (!modal) {
    return;
  }
  const title = modal.querySelector(
    "[data-install-title]"
  );
  const body = modal.querySelector(
    "[data-install-body]"
  );
  const action = modal.querySelector(
    "[data-install-action]"
  );
  if (isStandalone()) {
    title.textContent = "KAGE is already installed";
    body.textContent =
      "KAGE is already running as an installed application on this device.";
    action.textContent = "Close";
    action.onclick = closeInstallModal;
    modal.hidden = false;
    return;
  }
  if (deferredInstallPrompt) {
    title.textContent = "Install KAGE";
    body.textContent =
      "Install KAGE as an app on this device. Your KAGE UI and stored profile data stay with the installed experience.";
    action.textContent = "Install KAGE";
    action.onclick = async () => {
      try {
        await deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        updateInstallButton();
        closeInstallModal();
      } catch {
        closeInstallModal();
      }
    };
    modal.hidden = false;
    return;
  }
  if (isIOSInstallEnvironment()) {
    title.textContent = "Add KAGE to Home Screen";
    body.innerHTML =
      "On your iPhone or iPad:<br><br>" +
      "1. Tap the <strong>Share</strong> button in Safari.<br>" +
      "2. Choose <strong>Add to Home Screen</strong>.<br>" +
      "3. Tap <strong>Add</strong>.<br><br>" +
      "KAGE will then open like an installed app.";
    action.textContent = "Got it";
    action.onclick = closeInstallModal;
    modal.hidden = false;
    return;
  }
  title.textContent = "Install KAGE";
  body.textContent =
    "Your browser does not currently expose the automatic install prompt. " +
    "Open the browser's install/app menu and choose the option to install or add KAGE to your applications.";
  action.textContent = "Close";
  action.onclick = closeInstallModal;
  modal.hidden = false;
}
function closeInstallModal() {
  const modal = document.getElementById(
    "kage-install-modal"
  );
  if (modal) {
    modal.hidden = true;
  }
}
function updateInstallButton() {
  const button = document.getElementById(
    "kage-install-button"
  );
  if (!button) {
    return;
  }
  if (isStandalone()) {
    button.setAttribute(
      "aria-label",
      "KAGE is installed"
    );
    button.title = "KAGE is installed";
    return;
  }
  button.setAttribute(
    "aria-label",
    "Install KAGE"
  );
  button.title = "Install KAGE";
}
/* ---------------------------------------------------------
   PROFILE MODAL
--------------------------------------------------------- */
function openProfileModal() {
  const modal = document.getElementById(
    "kage-profile-modal"
  );
  if (!modal) {
    return;
  }
  const profile = readProfile();
  const nicknameInput = document.getElementById(
    "kage-nickname-input"
  );
  const avatarPreview = document.getElementById(
    "kage-avatar-preview"
  );
  nicknameInput.value = profile.nickname || "";
  renderAvatarPreview(
    avatarPreview,
    profile.avatar
  );
  modal.hidden = false;
  setTimeout(() => {
    nicknameInput.focus();
  }, 0);
}
function closeProfileModal() {
  const modal = document.getElementById(
    "kage-profile-modal"
  );
  if (modal) {
    modal.hidden = true;
  }
}
function renderAvatarPreview(element, avatar) {
  if (!element) {
    return;
  }
  if (avatar) {
    element.innerHTML = "";
    const image = document.createElement("img");
    image.src = avatar;
    image.alt = "Profile picture";
    element.appendChild(image);
    return;
  }
  element.innerHTML = `
    <div class="kage-avatar-default" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="34"
        height="34"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <circle cx="12" cy="8" r="3.5"></circle>
        <path
          d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"
        ></path>
      </svg>
    </div>
  `;
}
function handleAvatarUpload(file) {
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    return;
  }
  /*
   * Keep the avatar reasonably small so localStorage remains
   * practical on phones/tablets.
   */
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    alert("Please choose an image smaller than 5 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const profile = readProfile();
    profile.avatar =
      typeof reader.result === "string"
        ? reader.result
        : "";
    saveProfile(profile);
    const preview = document.getElementById(
      "kage-avatar-preview"
    );
    renderAvatarPreview(
      preview,
      profile.avatar
    );
    updateHeaderAvatar();
  };
  reader.readAsDataURL(file);
}
function removeAvatar() {
  const profile = readProfile();
  profile.avatar = "";
  saveProfile(profile);
  const preview = document.getElementById(
    "kage-avatar-preview"
  );
  renderAvatarPreview(
    preview,
    ""
  );
  updateHeaderAvatar();
}
/* ---------------------------------------------------------
   HEADER
--------------------------------------------------------- */
function findHeaderMount() {
  const selectors = [
    "header",
    ".header",
    ".topbar",
    ".top-bar",
    ".navbar",
    ".nav",
    "[data-kage-header]",
    "[data-header]"
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return document.body;
}
function createHeaderControls() {
  if (
    document.getElementById(
      "kage-profile-button"
    ) ||
    document.getElementById(
      "kage-install-button"
    )
  ) {
    return;
  }
  const mount = findHeaderMount();
  const controls = document.createElement("div");
  controls.id = "kage-identity-controls";
  controls.innerHTML = `
    <button
      id="kage-install-button"
      class="kage-header-icon-button"
      type="button"
      aria-label="Install KAGE"
      title="Install KAGE"
    >
      <svg
        viewBox="0 0 24 24"
        width="21"
        height="21"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M5 21h14"></path>
      </svg>
    </button>
    <button
      id="kage-profile-button"
      class="kage-profile-button"
      type="button"
      aria-label="Profile"
      aria-haspopup="dialog"
    >
      <span
        id="kage-header-avatar"
        class="kage-header-avatar"
      ></span>
      <span class="kage-profile-label">
        Profile
      </span>
    </button>
  `;
  /*
   * If a real header exists, place the controls at its end.
   * Otherwise use a fixed top-right position so the controls
   * are still physically visible without rewriting the app UI.
   */
  if (mount === document.body) {
    controls.classList.add(
      "kage-floating-controls"
    );
    document.body.appendChild(controls);
  } else {
    mount.appendChild(controls);
  }
  document
    .getElementById("kage-profile-button")
    .addEventListener(
      "click",
      openProfileModal
    );
  document
    .getElementById("kage-install-button")
    .addEventListener(
      "click",
      showInstallExperience
    );
  updateHeaderAvatar();
  updateInstallButton();
}
/* ---------------------------------------------------------
   PROFILE MODAL
--------------------------------------------------------- */
function createProfileModal() {
  if (
    document.getElementById(
      "kage-profile-modal"
    )
  ) {
    return;
  }
  const modal = document.createElement("div");
  modal.id = "kage-profile-modal";
  modal.className = "kage-modal-backdrop";
  modal.hidden = true;
  modal.innerHTML = `
    <section
      class="kage-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kage-profile-title"
    >
      <div class="kage-modal-header">
        <div>
          <h2 id="kage-profile-title">
            Profile
          </h2>
          <p>
            Customize how KAGE knows you.
          </p>
        </div>
        <button
          id="kage-profile-close"
          class="kage-modal-close"
          type="button"
          aria-label="Close profile"
        >
          ×
        </button>
      </div>
      <div class="kage-profile-editor">
        <div
          id="kage-avatar-preview"
          class="kage-avatar-preview"
        ></div>
        <div class="kage-avatar-actions">
          <label
            class="kage-secondary-button"
            for="kage-avatar-input"
          >
            Edit Profile Picture
          </label>
          <input
            id="kage-avatar-input"
            type="file"
            accept="image/*"
            hidden
          >
          <button
            id="kage-remove-avatar"
            class="kage-secondary-button"
            type="button"
          >
            Remove Picture
          </button>
        </div>
        <label
          class="kage-field-label"
          for="kage-nickname-input"
        >
          Nickname
        </label>
        <input
          id="kage-nickname-input"
          class="kage-text-input"
          type="text"
          maxlength="40"
          autocomplete="nickname"
          placeholder="What should KAGE call you?"
        >
        <div class="kage-profile-actions">
          <button
            id="kage-profile-cancel"
            class="kage-secondary-button"
            type="button"
          >
            Cancel
          </button>
          <button
            id="kage-profile-save"
            class="kage-primary-button"
            type="button"
          >
            Save Profile
          </button>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(modal);
  document
    .getElementById("kage-profile-close")
    .addEventListener(
      "click",
      closeProfileModal
    );
  document
    .getElementById("kage-profile-cancel")
    .addEventListener(
      "click",
      closeProfileModal
    );
  document
    .getElementById("kage-remove-avatar")
    .addEventListener(
      "click",
      removeAvatar
    );
  document
    .getElementById("kage-avatar-input")
    .addEventListener(
      "change",
      event => {
        const file =
          event.target.files?.[0];
        handleAvatarUpload(file);
        event.target.value = "";
      }
    );
  document
    .getElementById("kage-profile-save")
    .addEventListener(
      "click",
      () => {
        const profile = readProfile();
        const nicknameInput =
          document.getElementById(
            "kage-nickname-input"
          );
        profile.nickname =
          nicknameInput.value
            .trim()
            .slice(0, 40);
        saveProfile(profile);
        updateHeaderAvatar();
        closeProfileModal();
      }
    );
  modal.addEventListener(
    "click",
    event => {
      if (event.target === modal) {
        closeProfileModal();
      }
    }
  );
  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        !modal.hidden
      ) {
        closeProfileModal();
      }
    }
  );
  renderAvatarPreview(
    document.getElementById(
      "kage-avatar-preview"
    ),
    readProfile().avatar
  );
}
/* ---------------------------------------------------------
   HEADER AVATAR
--------------------------------------------------------- */
function updateHeaderAvatar() {
  const element =
    document.getElementById(
      "kage-header-avatar"
    );
  if (!element) {
    return;
  }
  const profile = readProfile();
  if (profile.avatar) {
    element.innerHTML = "";
    const image =
      document.createElement("img");
    image.src = profile.avatar;
    image.alt = "";
    element.appendChild(image);
    return;
  }
  element.innerHTML = `
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5"></circle>
      <path
        d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"
      ></path>
    </svg>
  `;
}
/* ---------------------------------------------------------
   STYLE
--------------------------------------------------------- */
function injectStyles() {
  if (
    document.getElementById(
      "kage-ui-integration-style"
    )
  ) {
    return;
  }
  const style =
    document.createElement("style");
  style.id =
    "kage-ui-integration-style";
  style.textContent = `
    #kage-identity-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      padding: 6px 10px;
      z-index: 1000;
    }
    .kage-floating-controls {
      position: fixed;
      top: max(12px, env(safe-area-inset-top));
      right: max(12px, env(safe-area-inset-right));
      z-index: 9999;
      background: rgba(11,11,15,.88);
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 14px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .kage-header-icon-button,
    .kage-profile-button {
      border: 0;
      cursor: pointer;
      color: inherit;
      font: inherit;
    }
    .kage-header-icon-button {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      background: transparent;
      transition: background .15s ease,
                  transform .15s ease;
    }
    .kage-header-icon-button:hover,
    .kage-header-icon-button:focus-visible {
      background: rgba(255,255,255,.09);
    }
    .kage-header-icon-button:active,
    .kage-profile-button:active {
      transform: scale(.96);
    }
    .kage-profile-button {
      min-height: 40px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px 4px 5px;
      border-radius: 12px;
      background: rgba(255,255,255,.06);
    }
    .kage-profile-button:hover,
    .kage-profile-button:focus-visible {
      background: rgba(255,255,255,.10);
    }
    .kage-profile-label {
      font-size: 14px;
      font-weight: 600;
    }
    .kage-header-avatar {
      width: 31px;
      height: 31px;
      border-radius: 50%;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,.10);
      flex-shrink: 0;
    }
    .kage-header-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .kage-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(0,0,0,.62);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .kage-modal-backdrop[hidden] {
      display: none;
    }
    .kage-modal {
      width: min(430px, 100%);
      max-height: calc(100dvh - 40px);
      overflow: auto;
      color: #fff;
      background: #111116;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 20px;
      box-shadow: 0 25px 80px rgba(0,0,0,.55);
    }
    .kage-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 22px 12px;
    }
    .kage-modal-header h2 {
      margin: 0 0 5px;
      font-size: 21px;
    }
    .kage-modal-header p {
      margin: 0;
      opacity: .62;
      font-size: 13px;
    }
    .kage-modal-close {
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 9px;
      background: rgba(255,255,255,.07);
      color: #fff;
      font-size: 25px;
      line-height: 1;
      cursor: pointer;
    }
    .kage-profile-editor {
      padding: 12px 22px 22px;
    }
    .kage-avatar-preview {
      width: 104px;
      height: 104px;
      margin: 8px auto 16px;
      overflow: hidden;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12);
    }
    .kage-avatar-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .kage-avatar-default {
      opacity: .72;
    }
    .kage-avatar-actions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .kage-field-label {
      display: block;
      margin-bottom: 7px;
      font-size: 13px;
      font-weight: 600;
      opacity: .8;
    }
    .kage-text-input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(255,255,255,.12);
      outline: none;
      border-radius: 11px;
      padding: 12px 13px;
      color: #fff;
      background: rgba(255,255,255,.06);
      font: inherit;
    }
    .kage-text-input:focus {
      border-color: rgba(255,255,255,.30);
    }
    .kage-profile-actions {
      display: flex;
      justify-content: flex-end;
      gap: 9px;
      margin-top: 20px;
    }
    .kage-primary-button,
    .kage-secondary-button {
      border: 0;
      border-radius: 10px;
      padding: 10px 13px;
      color: #fff;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .kage-primary-button {
      background: #fff;
      color: #111116;
    }
    .kage-secondary-button {
      background: rgba(255,255,255,.08);
    }
    .kage-primary-button:hover,
    .kage-secondary-button:hover {
      filter: brightness(1.1);
    }
    @media (max-width: 600px) {
      .kage-profile-label {
        display: none;
      }
      .kage-profile-button {
        padding-right: 5px;
      }
      .kage-floating-controls {
        top: max(8px, env(safe-area-inset-top));
        right: max(8px, env(safe-area-inset-right));
      }
    }
  `;
  document.head.appendChild(style);
}
/* ---------------------------------------------------------
   BOOTSTRAP
--------------------------------------------------------- */
function bootKageUI() {
  exposeProfileToKage();
  injectStyles();
  createHeaderControls();
  createProfileModal();
  updateHeaderAvatar();
  updateInstallButton();
}
/*
 * main.js may render the KAGE UI asynchronously.
 * Observe the DOM until the application header/body exists,
 * then mount exactly once.
 */
let booted = false;
function attemptBoot() {
  if (booted) {
    return;
  }
  if (!document.body) {
    return;
  }
  bootKageUI();
  booted = true;
}
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    attemptBoot,
    { once: true }
  );
} else {
  attemptBoot();
}
const observer =
  new MutationObserver(() => {
    if (!booted) {
      attemptBoot();
    }
  });
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
/*
 * Public API for the existing KAGE runtime.
 *
 * This lets future dispatcher/orchestrator code access
 * the same persisted identity without replacing those systems.
 */
window.KAGE_PROFILE_API = Object.freeze({
  getProfile() {
    return readProfile();
  },
  getNickname() {
    return readProfile().nickname || "";
  },
  getAvatar() {
    return readProfile().avatar || "";
  },
  saveProfile(profile) {
    return saveProfile(profile);
  }
});
