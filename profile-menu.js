import {
  getKageProfile,
  setKageNickname,
  setKageAvatar,
  removeKageAvatar,
} from "./profile.js";

const DEFAULT_AVATAR = `
<svg
  width="72"
  height="72"
  viewBox="0 0 72 72"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>
  <circle cx="36" cy="36" r="36" fill="#e5e7eb"/>
  <circle cx="36" cy="27" r="12" fill="#9ca3af"/>
  <path
    d="M15 61c3-12 11-18 21-18s18 6 21 18"
    fill="#9ca3af"
  />
</svg>
`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createAvatarMarkup(profile) {
  if (profile.avatar) {
    return `
      <img
        class="kage-profile-avatar"
        src="${escapeHtml(profile.avatar)}"
        alt="Profile picture"
      />
    `;
  }

  return `
    <div class="kage-profile-avatar kage-profile-default-avatar">
      ${DEFAULT_AVATAR}
    </div>
  `;
}

function createStyles() {
  if (document.getElementById("kage-profile-menu-styles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "kage-profile-menu-styles";

  style.textContent = `
    .kage-profile-menu {
      position: fixed;
      top: 72px;
      right: 20px;
      width: 320px;
      max-width: calc(100vw - 40px);
      padding: 20px;
      border: 1px solid rgba(128, 128, 128, 0.22);
      border-radius: 18px;
      background: var(--kage-profile-background, #ffffff);
      color: var(--kage-profile-text, #111111);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
      z-index: 9999;
      font-family: inherit;
    }

    .kage-profile-menu[hidden] {
      display: none;
    }

    .kage-profile-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }

    .kage-profile-avatar,
    .kage-profile-default-avatar {
      width: 72px;
      height: 72px;
      min-width: 72px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kage-profile-avatar {
      object-fit: cover;
    }

    .kage-profile-default-avatar svg {
      width: 72px;
      height: 72px;
      display: block;
    }

    .kage-profile-title {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
    }

    .kage-profile-subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      opacity: 0.65;
    }

    .kage-profile-field {
      margin-bottom: 16px;
    }

    .kage-profile-label {
      display: block;
      margin-bottom: 7px;
      font-size: 13px;
      font-weight: 600;
    }

    .kage-profile-input {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 12px;
      border: 1px solid rgba(128, 128, 128, 0.35);
      border-radius: 11px;
      background: transparent;
      color: inherit;
      font: inherit;
      outline: none;
    }

    .kage-profile-input:focus {
      border-color: currentColor;
    }

    .kage-profile-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .kage-profile-button {
      border: 0;
      border-radius: 10px;
      padding: 10px 13px;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      background: rgba(128, 128, 128, 0.13);
      color: inherit;
    }

    .kage-profile-button:hover {
      background: rgba(128, 128, 128, 0.2);
    }

    .kage-profile-save {
      width: 100%;
      margin-top: 4px;
    }

    .kage-profile-status {
      min-height: 18px;
      margin-top: 10px;
      font-size: 12px;
      opacity: 0.7;
    }

    .kage-profile-file {
      display: none;
    }

    @media (max-width: 600px) {
      .kage-profile-menu {
        top: 64px;
        right: 12px;
        width: calc(100vw - 24px);
        max-width: none;
      }
    }
  `;

  document.head.appendChild(style);
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No image selected."));
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read the image."));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Unable to read the image."));
    };

    reader.readAsDataURL(file);
  });
}

export function createKageProfileMenu() {
  createStyles();

  const existing = document.getElementById("kage-profile-menu");

  if (existing) {
    return existing;
  }

  const menu = document.createElement("section");

  menu.id = "kage-profile-menu";
  menu.className = "kage-profile-menu";
  menu.hidden = true;
  menu.setAttribute("aria-label", "KAGE Profile");

  menu.innerHTML = `
    <div class="kage-profile-header">
      <div id="kage-profile-avatar-container"></div>

      <div>
        <h2 class="kage-profile-title">Your Profile</h2>
        <p class="kage-profile-subtitle">
          Customize how KAGE knows you.
        </p>
      </div>
    </div>

    <div class="kage-profile-field">
      <label
        class="kage-profile-label"
        for="kage-profile-nickname"
      >
        Nickname
      </label>

      <input
        id="kage-profile-nickname"
        class="kage-profile-input"
        type="text"
        maxlength="40"
        autocomplete="nickname"
        placeholder="What should KAGE call you?"
      />
    </div>

    <div class="kage-profile-field">
      <span class="kage-profile-label">
        Profile picture
      </span>

      <div class="kage-profile-actions">
        <button
          id="kage-profile-upload"
          class="kage-profile-button"
          type="button"
        >
          Edit Profile Picture
        </button>

        <button
          id="kage-profile-remove"
          class="kage-profile-button"
          type="button"
        >
          No Picture
        </button>
      </div>

      <input
        id="kage-profile-file"
        class="kage-profile-file"
        type="file"
        accept="image/*"
      />
    </div>

    <button
      id="kage-profile-save"
      class="kage-profile-button kage-profile-save"
      type="button"
    >
      Save Profile
    </button>

    <div
      id="kage-profile-status"
      class="kage-profile-status"
      aria-live="polite"
    ></div>
  `;

  document.body.appendChild(menu);

  const avatarContainer = menu.querySelector(
    "#kage-profile-avatar-container"
  );

  const nicknameInput = menu.querySelector(
    "#kage-profile-nickname"
  );

  const uploadButton = menu.querySelector(
    "#kage-profile-upload"
  );

  const removeButton = menu.querySelector(
    "#kage-profile-remove"
  );

  const fileInput = menu.querySelector(
    "#kage-profile-file"
  );

  const saveButton = menu.querySelector(
    "#kage-profile-save"
  );

  const status = menu.querySelector(
    "#kage-profile-status"
  );

  let currentProfile = getKageProfile();

  function renderProfile() {
    avatarContainer.innerHTML = createAvatarMarkup(currentProfile);

    nicknameInput.value = currentProfile.nickname || "";
  }

  function showStatus(message) {
    status.textContent = message;
  }

  uploadButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];

    if (!file) {
      return;
    }

    try {
      const avatar = await readImageFile(file);

      currentProfile = {
        ...currentProfile,
        avatar,
      };

      renderProfile();

      showStatus("Profile picture selected. Tap Save Profile.");
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Unable to select that picture."
      );
    }

    fileInput.value = "";
  });

  removeButton.addEventListener("click", () => {
    currentProfile = {
      ...currentProfile,
      avatar: null,
    };

    renderProfile();

    showStatus("Profile picture removed. Tap Save Profile.");
  });

  saveButton.addEventListener("click", () => {
    currentProfile = setKageNickname(
      nicknameInput.value
    );

    if (currentProfile.avatar) {
      currentProfile = setKageAvatar(
        currentProfile.avatar
      );
    } else {
      currentProfile = removeKageAvatar();
    }

    renderProfile();

    showStatus("Profile saved.");

    menu.dispatchEvent(
      new CustomEvent("kage-profile-updated", {
        bubbles: true,
        detail: {
          profile: currentProfile,
        },
      })
    );
  });

  renderProfile();

  return menu;
}

export function openKageProfileMenu() {
  const menu = createKageProfileMenu();

  menu.hidden = false;

  const nicknameInput = menu.querySelector(
    "#kage-profile-nickname"
  );

  nicknameInput?.focus();

  return menu;
}

export function closeKageProfileMenu() {
  const menu = document.getElementById(
    "kage-profile-menu"
  );

  if (!menu) {
    return;
  }

  menu.hidden = true;
}

export function toggleKageProfileMenu() {
  const menu = createKageProfileMenu();

  menu.hidden = !menu.hidden;

  if (!menu.hidden) {
    const profile = getKageProfile();

    const nicknameInput = menu.querySelector(
      "#kage-profile-nickname"
    );

    const avatarContainer = menu.querySelector(
      "#kage-profile-avatar-container"
    );

    if (nicknameInput) {
      nicknameInput.value = profile.nickname || "";
    }

    if (avatarContainer) {
      avatarContainer.innerHTML =
        createAvatarMarkup(profile);
    }
  }

  return menu;
}

export function getCurrentKageProfile() {
  return getKageProfile();
}
