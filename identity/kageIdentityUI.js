import {
  getProfile,
  setNickname,
  setAvatarFromFile,
  removeAvatar,
  subscribeToProfileUpdates
} from "../profile/kageProfile.js";
const STYLE_ID = "kage-identity-ui-styles";
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .kage-identity-panel {
      position: fixed;
      top: 72px;
      right: 16px;
      width: min(340px, calc(100vw - 32px));
      padding: 18px;
      border-radius: 18px;
      z-index: 9999;
      background: var(--background, #111);
      color: var(--foreground, #fff);
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 18px 50px rgba(0,0,0,.35);
      display: none;
      box-sizing: border-box;
    }
    .kage-identity-panel.open {
      display: block;
    }
    .kage-identity-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .kage-identity-avatar {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(255,255,255,.08);
    }
    .kage-identity-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .kage-identity-button {
      border: 0;
      border-radius: 10px;
      padding: 9px 12px;
      cursor: pointer;
      background: rgba(255,255,255,.1);
      color: inherit;
      font: inherit;
    }
    .kage-identity-button:hover {
      background: rgba(255,255,255,.16);
    }
    .kage-identity-input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: rgba(255,255,255,.06);
      color: inherit;
      outline: none;
      font: inherit;
    }
    .kage-identity-label {
      display: block;
      font-size: 13px;
      opacity: .75;
      margin-bottom: 6px;
    }
    .kage-install-panel {
      position: fixed;
      top: 72px;
      right: 16px;
      width: min(340px, calc(100vw - 32px));
      padding: 18px;
      border-radius: 18px;
      z-index: 9999;
      background: var(--background, #111);
      color: var(--foreground, #fff);
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 18px 50px rgba(0,0,0,.35);
      display: none;
      box-sizing: border-box;
    }
    .kage-install-panel.open {
      display: block;
    }
    .kage-install-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .kage-install-text {
      font-size: 14px;
      line-height: 1.45;
      opacity: .8;
      margin-bottom: 14px;
    }
  `;
  document.head.appendChild(style);
}
function createButton(label, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `kage-identity-button ${className}`.trim();
  button.textContent = label;
  return button;
}
function createProfilePanel() {
  const panel = document.createElement("section");
  panel.className = "kage-identity-panel";
  panel.setAttribute("aria-label", "KAGE Profile");
  panel.innerHTML = `
    <div class="kage-identity-title">Profile</div>
    <img
      class="kage-identity-avatar"
      alt="Profile picture"
      hidden
    />
    <div class="kage-identity-row">
      <button
        type="button"
        class="kage-identity-button kage-avatar-upload"
      >
        Edit Profile Picture
      </button>
      <button
        type="button"
        class="kage-identity-button kage-avatar-remove"
      >
        Remove Picture
      </button>
    </div>
    <input
      class="kage-avatar-input"
      type="file"
      accept="image/*"
      hidden
    />
    <label class="kage-identity-label" for="kage-nickname-input">
      Nickname
    </label>
    <input
      id="kage-nickname-input"
      class="kage-identity-input"
      type="text"
      maxlength="40"
      autocomplete="nickname"
      placeholder="What should KAGE call you?"
    />
    <button
      type="button"
      class="kage-identity-button kage-nickname-save"
    >
      Save Nickname
    </button>
  `;
  return panel;
}
function createInstallPanel() {
  const panel = document.createElement("section");
  panel.className = "kage-install-panel";
  panel.setAttribute("aria-label", "Install KAGE");
  panel.innerHTML = `
    <div class="kage-install-title">Install KAGE</div>
    <div class="kage-install-text">
      Install KAGE on this device for a more app-like experience.
    </div>
    <button
      type="button"
      class="kage-identity-button kage-install-action"
    >
      Install KAGE
    </button>
  `;
  return panel;
}
function updateProfilePanel(panel) {
  const profile = getProfile();
  const avatar = panel.querySelector(".kage-identity-avatar");
  const nicknameInput = panel.querySelector(".kage-identity-input");
  if (profile.avatar) {
    avatar.src = profile.avatar;
    avatar.hidden = false;
  } else {
    avatar.removeAttribute("src");
    avatar.hidden = true;
  }
  if (document.activeElement !== nicknameInput) {
    nicknameInput.value = profile.nickname || "";
  }
}
function getInstallInstructions() {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  if (isIOS) {
    return {
      title: "Install KAGE",
      text:
        "On iPhone or iPad, open the browser Share menu and choose “Add to Home Screen”."
    };
  }
  if (isAndroid) {
    return {
      title: "Install KAGE",
      text:
        "Use your browser’s install option or the “Install app” option from the browser menu."
    };
  }
  return {
    title: "Install KAGE",
    text:
      "Use the browser’s install option when it is available. Chromium-based browsers can install KAGE as an app."
  };
}
function setupInstall(panel) {
  const button = panel.querySelector(".kage-install-action");
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });
  button.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {
        // User closed or rejected the install prompt.
      }
      deferredPrompt = null;
      return;
    }
    const instructions = getInstallInstructions();
    panel.querySelector(".kage-install-title").textContent =
      instructions.title;
    panel.querySelector(".kage-install-text").textContent =
      instructions.text;
  });
}
function setupProfile(panel) {
  const uploadButton = panel.querySelector(".kage-avatar-upload");
  const removeButton = panel.querySelector(".kage-avatar-remove");
  const fileInput = panel.querySelector(".kage-avatar-input");
  const nicknameInput = panel.querySelector(".kage-identity-input");
  const saveNickname = panel.querySelector(".kage-nickname-save");
  uploadButton.addEventListener("click", () => {
    fileInput.click();
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      await setAvatarFromFile(file);
      updateProfilePanel(panel);
    } catch (error) {
      console.error("KAGE profile picture error:", error);
      window.alert("KAGE could not use that picture.");
    }
    fileInput.value = "";
  });
  removeButton.addEventListener("click", () => {
    removeAvatar();
    updateProfilePanel(panel);
  });
  saveNickname.addEventListener("click", () => {
    setNickname(nicknameInput.value);
    updateProfilePanel(panel);
  });
}
function mountKageIdentityUI(options = {}) {
  if (typeof window === "undefined" || !document.body) {
    return null;
  }
  injectStyles();
  const existing = document.getElementById("kage-identity-root");
  if (existing) {
    return existing;
  }
  const root = document.createElement("div");
  root.id = "kage-identity-root";
  const profilePanel = createProfilePanel();
  const installPanel = createInstallPanel();
  root.appendChild(profilePanel);
  root.appendChild(installPanel);
  document.body.appendChild(root);
  setupProfile(profilePanel);
  setupInstall(installPanel);
  updateProfilePanel(profilePanel);
  const profileButton =
    options.profileButton ||
    document.querySelector(
      "[data-kage-profile], #profile, .profile-button, .profile-btn"
    );
  const downloadButton =
    options.downloadButton ||
    document.querySelector(
      "[data-kage-download], #downloadKage, .download-kage-button"
    );
  if (profileButton) {
    profileButton.addEventListener("click", (event) => {
      event.stopPropagation();
      installPanel.classList.remove("open");
      profilePanel.classList.toggle("open");
    });
  }
  if (downloadButton) {
    downloadButton.addEventListener("click", (event) => {
      event.stopPropagation();
      profilePanel.classList.remove("open");
      installPanel.classList.toggle("open");
    });
  }
  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) {
      profilePanel.classList.remove("open");
      installPanel.classList.remove("open");
    }
  });
  subscribeToProfileUpdates(() => {
    updateProfilePanel(profilePanel);
  });
  return root;
}
function getKageNickname() {
  const profile = getProfile();
  return profile.nickname || "";
}
function getKageUserContext() {
  const nickname = getKageNickname();
  return {
    nickname,
    hasNickname: Boolean(nickname)
  };
}
export {
  mountKageIdentityUI,
  getKageNickname,
  getKageUserContext
};
