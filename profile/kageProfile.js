/*
 * KAGE Profile + Header Controls
 *
 * Provides:
 * - Real profile/person SVG button
 * - Real download SVG button
 * - Profile editor
 * - Avatar upload
 * - Avatar removal
 * - Nickname persistence
 * - Avatar persistence
 * - KAGE-readable identity
 * - Install/download action
 */
const PROFILE_STORAGE_KEY = "kage_profile";
let deferredInstallPrompt = null;
function loadProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!saved) {
      return {
        nickname: "",
        avatar: ""
      };
    }
    const profile = JSON.parse(saved);
    return {
      nickname: typeof profile.nickname === "string" ? profile.nickname : "",
      avatar: typeof profile.avatar === "string" ? profile.avatar : ""
    };
  } catch {
    return {
      nickname: "",
      avatar: ""
    };
  }
}
function saveProfile(profile) {
  localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify({
      nickname: profile.nickname || "",
      avatar: profile.avatar || ""
    })
  );
  window.dispatchEvent(
    new CustomEvent("kage-profile-updated", {
      detail: profile
    })
  );
}
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});
function personIcon() {
  return `
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5"></circle>
      <path d="M5 20c.8-3.4 3.1-5.5 7-5.5s6.2 2.1 7 5.5"></path>
    </svg>
  `;
}
function downloadIcon() {
  return `
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
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
function createStyles() {
  if (document.getElementById("kage-profile-menu-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "kage-profile-menu-styles";
  style.textContent = `
    .kage-header-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }
    .kage-header-icon {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      position: relative;
    }
    .kage-header-icon:hover {
      background: rgba(255,255,255,.08);
    }
    .kage-header-icon:active {
      transform: scale(.96);
    }
    .kage-header-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .kage-profile-panel {
      position: fixed;
      top: 64px;
      right: 16px;
      width: min(340px, calc(100vw - 32px));
      background: #111;
      color: #fff;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 18px;
      padding: 18px;
      z-index: 99999;
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      display: none;
    }
    .kage-profile-panel.open {
      display: block;
    }
    .kage-profile-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }
    .kage-profile-title {
      font-size: 18px;
      font-weight: 700;
    }
    .kage-profile-close {
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 10px;
      background: rgba(255,255,255,.08);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .kage-profile-avatar-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
    }
    .kage-profile-avatar {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      object-fit: cover;
      background: rgba(255,255,255,.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,.65);
    }
    .kage-profile-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    .kage-profile-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .kage-profile-action {
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 10px;
      background: rgba(255,255,255,.07);
      color: #fff;
      padding: 9px 12px;
      cursor: pointer;
      font-size: 13px;
    }
    .kage-profile-action:hover {
      background: rgba(255,255,255,.12);
    }
    .kage-profile-field {
      margin-top: 14px;
    }
    .kage-profile-field label {
      display: block;
      font-size: 13px;
      opacity: .75;
      margin-bottom: 7px;
    }
    .kage-profile-field input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 10px;
      background: rgba(255,255,255,.06);
      color: #fff;
      padding: 11px 12px;
      outline: none;
    }
    .kage-profile-save {
      width: 100%;
      margin-top: 16px;
      border: 0;
      border-radius: 11px;
      padding: 11px 14px;
      background: #fff;
      color: #000;
      font-weight: 700;
      cursor: pointer;
    }
    .kage-install-panel {
      position: fixed;
      top: 64px;
      right: 16px;
      width: min(340px, calc(100vw - 32px));
      background: #111;
      color: #fff;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 18px;
      padding: 18px;
      z-index: 99999;
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      display: none;
    }
    .kage-install-panel.open {
      display: block;
    }
    .kage-install-panel h3 {
      margin: 0 0 8px;
      font-size: 17px;
    }
    .kage-install-panel p {
      margin: 0 0 12px;
      font-size: 13px;
      line-height: 1.5;
      opacity: .78;
    }
    .kage-install-button {
      width: 100%;
      border: 0;
      border-radius: 11px;
      padding: 11px;
      background: #fff;
      color: #000;
      font-weight: 700;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}
function findHeader() {
  return (
    document.querySelector("header") ||
    document.querySelector(".header") ||
    document.querySelector(".topBar") ||
    document.querySelector(".topbar") ||
    document.querySelector(".navbar") ||
    document.querySelector(".nav")
  );
}
function createControls() {
  if (document.getElementById("kage-header-controls")) {
    return;
  }
  const header = findHeader();
  if (!header) {
    return;
  }
  createStyles();
  const controls = document.createElement("div");
  controls.id = "kage-header-controls";
  controls.className = "kage-header-controls";
  controls.innerHTML = `
    <button
      id="kage-download-button"
      class="kage-header-icon"
      type="button"
      aria-label="Install KAGE"
      title="Install KAGE"
    >
      ${downloadIcon()}
    </button>
    <button
      id="kage-profile-button"
      class="kage-header-icon"
      type="button"
      aria-label="Profile"
      title="Profile"
    >
      ${personIcon()}
    </button>
  `;
  header.appendChild(controls);
  createProfilePanel();
  createInstallPanel();
  document
    .getElementById("kage-profile-button")
    .addEventListener("click", toggleProfile);
  document
    .getElementById("kage-download-button")
    .addEventListener("click", handleInstallClick);
  updateProfileButton();
}
function createProfilePanel() {
  if (document.getElementById("kage-profile-panel")) {
    return;
  }
  const panel = document.createElement("div");
  panel.id = "kage-profile-panel";
  panel.className = "kage-profile-panel";
  panel.innerHTML = `
    <div class="kage-profile-top">
      <div class="kage-profile-title">Profile</div>
      <button
        id="kage-profile-close"
        class="kage-profile-close"
        type="button"
        aria-label="Close profile"
      >
        ${closeIcon()}
      </button>
    </div>
    <div class="kage-profile-avatar-area">
      <div id="kage-profile-avatar" class="kage-profile-avatar">
        ${personIcon()}
      </div>
      <div class="kage-profile-actions">
        <button
          id="kage-avatar-upload"
          class="kage-profile-action"
          type="button"
        >
          Change picture
        </button>
        <button
          id="kage-avatar-remove"
          class="kage-profile-action"
          type="button"
        >
          Remove picture
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
      <label for="kage-nickname-input">Nickname</label>
      <input
        id="kage-nickname-input"
        type="text"
        maxlength="40"
        autocomplete="nickname"
        placeholder="What should KAGE call you?"
      />
    </div>
    <button
      id="kage-profile-save"
      class="kage-profile-save"
      type="button"
    >
      Save profile
    </button>
  `;
  document.body.appendChild(panel);
  document
    .getElementById("kage-profile-close")
    .addEventListener("click", closeProfile);
  document
    .getElementById("kage-avatar-upload")
    .addEventListener("click", () => {
      document.getElementById("kage-avatar-input").click();
    });
  document
    .getElementById("kage-avatar-input")
    .addEventListener("change", handleAvatarUpload);
  document
    .getElementById("kage-avatar-remove")
    .addEventListener("click", removeAvatar);
  document
    .getElementById("kage-profile-save")
    .addEventListener("click", saveProfileFromPanel);
  populateProfilePanel();
}
function createInstallPanel() {
  if (document.getElementById("kage-install-panel")) {
    return;
  }
  const panel = document.createElement("div");
  panel.id = "kage-install-panel";
  panel.className = "kage-install-panel";
  panel.innerHTML = `
    <div class="kage-profile-top">
      <div class="kage-profile-title">Install KAGE</div>
      <button
        id="kage-install-close"
        class="kage-profile-close"
        type="button"
        aria-label="Close install panel"
      >
        ${closeIcon()}
      </button>
    </div>
    <div id="kage-install-content"></div>
  `;
  document.body.appendChild(panel);
  document
    .getElementById("kage-install-close")
    .addEventListener("click", closeInstallPanel);
}
function populateProfilePanel() {
  const profile = loadProfile();
  const nicknameInput =
    document.getElementById("kage-nickname-input");
  if (nicknameInput) {
    nicknameInput.value = profile.nickname;
  }
  renderProfileAvatar(profile.avatar);
}
function renderProfileAvatar(avatar) {
  const avatarElement =
    document.getElementById("kage-profile-avatar");
  if (!avatarElement) {
    return;
  }
  if (avatar) {
    avatarElement.innerHTML = `
      <img
        src="${avatar}"
        alt="Profile picture"
      />
    `;
  } else {
    avatarElement.innerHTML = personIcon();
  }
  updateProfileButton();
}
function updateProfileButton() {
  const button =
    document.getElementById("kage-profile-button");
  if (!button) {
    return;
  }
  const profile = loadProfile();
  if (profile.avatar) {
    button.innerHTML = `
      <img
        class="kage-header-avatar"
        src="${profile.avatar}"
        alt="Profile"
      />
    `;
  } else {
    button.innerHTML = personIcon();
  }
}
function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    alert("Please choose an image.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const profile = loadProfile();
    profile.avatar = reader.result;
    saveProfile(profile);
    renderProfileAvatar(profile.avatar);
  };
  reader.readAsDataURL(file);
}
function removeAvatar() {
  const profile = loadProfile();
  profile.avatar = "";
  saveProfile(profile);
  renderProfileAvatar("");
}
function saveProfileFromPanel() {
  const nicknameInput =
    document.getElementById("kage-nickname-input");
  const profile = loadProfile();
  profile.nickname = nicknameInput
    ? nicknameInput.value.trim()
    : profile.nickname;
  saveProfile(profile);
  updateProfileButton();
  closeProfile();
}
function toggleProfile() {
  const panel =
    document.getElementById("kage-profile-panel");
  if (!panel) {
    return;
  }
  populateProfilePanel();
  panel.classList.toggle("open");
}
function closeProfile() {
  const panel =
    document.getElementById("kage-profile-panel");
  if (panel) {
    panel.classList.remove("open");
  }
}
function openInstallPanel() {
  const panel =
    document.getElementById("kage-install-panel");
  if (!panel) {
    return;
  }
  const content =
    document.getElementById("kage-install-content");
  if (isStandalone()) {
    content.innerHTML = `
      <p>KAGE is already installed on this device.</p>
    `;
  } else if (deferredInstallPrompt) {
    content.innerHTML = `
      <p>
        Install KAGE as an app for a faster,
        app-like experience.
      </p>
      <button
        id="kage-install-now"
        class="kage-install-button"
        type="button"
      >
        Install KAGE
      </button>
    `;
    document
      .getElementById("kage-install-now")
      .addEventListener("click", installKage);
  } else if (
    /iphone|ipad|ipod/i.test(navigator.userAgent)
  ) {
    content.innerHTML = `
      <p>
        On iPhone or iPad, open the Share menu,
        choose <strong>Add to Home Screen</strong>,
        then add KAGE.
      </p>
    `;
  } else {
    content.innerHTML = `
      <p>
        Your browser does not currently expose
        the automatic install prompt.
        Use your browser's install or
        “Add to Home Screen” option for KAGE.
      </p>
    `;
  }
  panel.classList.add("open");
}
async function installKage() {
  if (!deferredInstallPrompt) {
    openInstallPanel();
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  closeInstallPanel();
}
function handleInstallClick() {
  openInstallPanel();
}
function closeInstallPanel() {
  const panel =
    document.getElementById("kage-install-panel");
  if (panel) {
    panel.classList.remove("open");
  }
}
window.KAGEProfile = {
  getProfile() {
    return loadProfile();
  },
  getNickname() {
    return loadProfile().nickname;
  },
  getAvatar() {
    return loadProfile().avatar;
  }
};
window.addEventListener("kage-profile-updated", (event) => {
  updateProfileButton();
  window.dispatchEvent(
    new CustomEvent("kage-identity-updated", {
      detail: event.detail
    })
  );
});
function mountKageProfileControls() {
  createControls();
}
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    mountKageProfileControls
  );
} else {
  mountKageProfileControls();
}
