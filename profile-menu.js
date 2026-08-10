/*
 * KAGE Profile Menu + Header Controls
 *
 * Handles:
 * - Profile button
 * - Download/install button
 * - Profile menu
 * - Avatar upload
 * - Avatar removal
 * - Nickname editing
 * - Install experience
 *
 * Profile data is handled by kage-profile.js.
 */
let kageDeferredInstallPrompt = null;
function kagePersonIcon(size = 20) {
  return `
    <svg
      viewBox="0 0 24 24"
      width="${size}"
      height="${size}"
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
function kageDownloadIcon(size = 20) {
  return `
    <svg
      viewBox="0 0 24 24"
      width="${size}"
      height="${size}"
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
function kageCloseIcon(size = 18) {
  return `
    <svg
      viewBox="0 0 24 24"
      width="${size}"
      height="${size}"
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
function kageCreateStyles() {
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
    }
    .kage-profile-panel,
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
    .kage-profile-panel.open,
    .kage-install-panel.open {
      display: block;
    }
    .kage-profile-top {
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
      gap: 12px;
      margin-bottom: 18px;
    }
    .kage-profile-avatar {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: rgba(255,255,255,.08);
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
    }
    .kage-profile-field {
      margin-top: 14px;
    }
    .kage-profile-field label {
      display: block;
      margin-bottom: 7px;
      font-size: 13px;
      opacity: .75;
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
      padding: 11px;
      background: #fff;
      color: #000;
      font-weight: 700;
      cursor: pointer;
    }
    .kage-install-panel p {
      font-size: 13px;
      line-height: 1.5;
      opacity: .8;
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
function kageFindHeader() {
  return (
    document.querySelector("header") ||
    document.querySelector(".header") ||
    document.querySelector(".topBar") ||
    document.querySelector(".topbar") ||
    document.querySelector(".navbar") ||
    document.querySelector(".nav")
  );
}
function kageCreateHeaderControls() {
  if (document.getElementById("kage-header-controls")) {
    return true;
  }
  const header = kageFindHeader();
  if (!header) {
    return false;
  }
  kageCreateStyles();
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
      ${kageDownloadIcon()}
    </button>
    <button
      id="kage-profile-button"
      class="kage-header-icon"
      type="button"
      aria-label="Profile"
      title="Profile"
    >
      ${kagePersonIcon()}
    </button>
  `;
  header.appendChild(controls);
  kageCreateProfilePanel();
  kageCreateInstallPanel();
  document
    .getElementById("kage-profile-button")
    .addEventListener("click", kageToggleProfile);
  document
    .getElementById("kage-download-button")
    .addEventListener("click", kageOpenInstall);
  kageUpdateProfileButton();
  return true;
}
function kageCreateProfilePanel() {
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
      >
        ${kageCloseIcon()}
      </button>
    </div>
    <div class="kage-profile-avatar-area">
      <div id="kage-profile-avatar" class="kage-profile-avatar">
        ${kagePersonIcon(30)}
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
      <label for="kage-nickname-input">
        Nickname
      </label>
      <input
        id="kage-nickname-input"
        type="text"
        maxlength="40"
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
    .addEventListener("click", kageCloseProfile);
  document
    .getElementById("kage-avatar-upload")
    .addEventListener("click", () => {
      document
        .getElementById("kage-avatar-input")
        .click();
    });
  document
    .getElementById("kage-avatar-input")
    .addEventListener(
      "change",
      kageHandleAvatarUpload
    );
  document
    .getElementById("kage-avatar-remove")
    .addEventListener(
      "click",
      kageRemoveAvatar
    );
  document
    .getElementById("kage-profile-save")
    .addEventListener(
      "click",
      kageSaveProfile
    );
}
function kageCreateInstallPanel() {
  const panel = document.createElement("div");
  panel.id = "kage-install-panel";
  panel.className = "kage-install-panel";
  panel.innerHTML = `
    <div class="kage-profile-top">
      <div class="kage-profile-title">
        Install KAGE
      </div>
      <button
        id="kage-install-close"
        class="kage-profile-close"
        type="button"
      >
        ${kageCloseIcon()}
      </button>
    </div>
    <div id="kage-install-content"></div>
  `;
  document.body.appendChild(panel);
  document
    .getElementById("kage-install-close")
    .addEventListener(
      "click",
      kageCloseInstall
    );
}
function kagePopulateProfile() {
  if (!window.KAGEProfile) {
    return;
  }
  const profile =
    window.KAGEProfile.getProfile();
  const nicknameInput =
    document.getElementById(
      "kage-nickname-input"
    );
  if (nicknameInput) {
    nicknameInput.value =
      profile.nickname || "";
  }
  kageRenderAvatar(
    profile.avatar || ""
  );
}
function kageRenderAvatar(avatar) {
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
      kagePersonIcon(30);
  }
  kageUpdateProfileButton();
}
function kageUpdateProfileButton() {
  const button =
    document.getElementById(
      "kage-profile-button"
    );
  if (!button || !window.KAGEProfile) {
    return;
  }
  const avatar =
    window.KAGEProfile.getAvatar();
  button.innerHTML = avatar
    ? `
      <img
        class="kage-header-avatar"
        src="${avatar}"
        alt="Profile"
      />
    `
    : kagePersonIcon();
}
function kageHandleAvatarUpload(event) {
  const file =
    event.target.files?.[0];
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    alert("Please select an image.");
    return;
  }
  const reader =
    new FileReader();
  reader.onload = () => {
    window.KAGEProfile.setAvatar(
      reader.result
    );
    kageRenderAvatar(
      reader.result
    );
  };
  reader.readAsDataURL(file);
}
function kageRemoveAvatar() {
  window.KAGEProfile.removeAvatar();
  kageRenderAvatar("");
}
function kageSaveProfile() {
  const input =
    document.getElementById(
      "kage-nickname-input"
    );
  const nickname =
    input
      ? input.value.trim()
      : "";
  window.KAGEProfile.setNickname(
    nickname
  );
  kageUpdateProfileButton();
  kageCloseProfile();
}
function kageToggleProfile() {
  const panel =
    document.getElementById(
      "kage-profile-panel"
    );
  if (!panel) {
    return;
  }
  kagePopulateProfile();
  panel.classList.toggle("open");
}
function kageCloseProfile() {
  const panel =
    document.getElementById(
      "kage-profile-panel"
    );
  if (panel) {
    panel.classList.remove("open");
  }
}
function kageIsStandalone() {
  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  );
}
window.addEventListener(
  "beforeinstallprompt",
  event => {
    event.preventDefault();
    kageDeferredInstallPrompt =
      event;
  }
);
function kageOpenInstall() {
  const panel =
    document.getElementById(
      "kage-install-panel"
    );
  const content =
    document.getElementById(
      "kage-install-content"
    );
  if (!panel || !content) {
    return;
  }
  if (kageIsStandalone()) {
    content.innerHTML = `
      <p>
        KAGE is already installed.
      </p>
    `;
  } else if (kageDeferredInstallPrompt) {
    content.innerHTML = `
      <p>
        Install KAGE as an app.
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
      .getElementById(
        "kage-install-now"
      )
      .addEventListener(
        "click",
        kageInstallNow
      );
  } else if (
    /iphone|ipad|ipod/i.test(
      navigator.userAgent
    )
  ) {
    content.innerHTML = `
      <p>
        Open the Safari Share menu and choose
        <strong>Add to Home Screen</strong>.
      </p>
    `;
  } else {
    content.innerHTML = `
      <p>
        Use your browser's
        <strong>Install KAGE</strong> or
        <strong>Add to Home Screen</strong>
        option.
      </p>
    `;
  }
  panel.classList.add("open");
}
async function kageInstallNow() {
  if (!kageDeferredInstallPrompt) {
    return;
  }
  kageDeferredInstallPrompt.prompt();
  await kageDeferredInstallPrompt.userChoice;
  kageDeferredInstallPrompt = null;
  kageCloseInstall();
}
function kageCloseInstall() {
  const panel =
    document.getElementById(
      "kage-install-panel"
    );
  if (panel) {
    panel.classList.remove("open");
  }
}
window.addEventListener(
  "kage-profile-updated",
  event => {
    kageUpdateProfileButton();
    window.dispatchEvent(
      new CustomEvent(
        "kage-identity-updated",
        {
          detail: event.detail
        }
      )
    );
  }
);
function kageMountProfileMenu() {
  if (kageCreateHeaderControls()) {
    kagePopulateProfile();
  }
}
if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    kageMountProfileMenu
  );
} else {
  kageMountProfileMenu();
}
