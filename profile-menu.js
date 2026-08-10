const PROFILE_STORAGE_KEY = "kage-profile";

const defaultProfile = {
  nickname: "",
  avatar: ""
};

function loadProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!saved) {
      return { ...defaultProfile };
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
    return { ...defaultProfile };
  }
}

function saveProfile(profile) {
  localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify(profile)
  );

  window.dispatchEvent(
    new CustomEvent("kage-profile-updated", {
      detail: profile
    })
  );
}

function getProfile() {
  return loadProfile();
}

function getNickname() {
  return loadProfile().nickname;
}

function createAvatar(profile, small = false) {
  const avatar = document.createElement("div");

  avatar.className = small
    ? "kage-profile-avatar kage-profile-avatar-small"
    : "kage-profile-avatar";

  if (profile.avatar) {
    const image = document.createElement("img");

    image.src = profile.avatar;
    image.alt = "Profile picture";

    avatar.appendChild(image);
  } else {
    avatar.textContent = "◉";
  }

  return avatar;
}

function injectStyles() {
  if (document.getElementById("kage-profile-menu-styles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "kage-profile-menu-styles";

  style.textContent = `
    .kage-identity-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      z-index: 1000;
    }

    .kage-icon-button {
      width: 38px;
      height: 38px;
      border: 1px solid #151515;
      background: #050505;
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      font-size: 16px;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;
    }

    .kage-icon-button:hover {
      background: #0b0b0b;
      border-color: #292929;
    }

    .kage-icon-button:active {
      transform: scale(0.95);
    }

    .kage-profile-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111111;
      color: #777777;
      font-size: 14px;
      font-weight: 600;
    }

    .kage-profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .kage-profile-avatar-small {
      width: 30px;
      height: 30px;
    }

    .kage-profile-panel {
      position: absolute;
      top: 48px;
      right: 0;
      width: 290px;
      background: #050505;
      border: 1px solid #171717;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
      color: #ffffff;
      display: none;
    }

    .kage-profile-panel.open {
      display: block;
    }

    .kage-profile-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 14px;
    }

    .kage-profile-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .kage-profile-preview .kage-profile-avatar {
      width: 58px;
      height: 58px;
      flex: 0 0 58px;
      font-size: 18px;
    }

    .kage-profile-name-preview {
      min-width: 0;
    }

    .kage-profile-name-preview strong {
      display: block;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .kage-profile-name-preview span {
      display: block;
      margin-top: 3px;
      color: #666666;
      font-size: 12px;
    }

    .kage-profile-label {
      display: block;
      color: #777777;
      font-size: 11px;
      margin-bottom: 6px;
    }

    .kage-profile-input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #181818;
      background: #090909;
      color: #ffffff;
      border-radius: 9px;
      padding: 10px 11px;
      outline: none;
      margin-bottom: 10px;
    }

    .kage-profile-input:focus {
      border-color: #303030;
    }

    .kage-profile-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }

    .kage-profile-action {
      border: 1px solid #181818;
      background: #090909;
      color: #ffffff;
      border-radius: 9px;
      padding: 9px;
      cursor: pointer;
      font-size: 12px;
    }

    .kage-profile-action:hover {
      background: #101010;
    }

    .kage-profile-action.primary {
      background: #ffffff;
      color: #000000;
      border-color: #ffffff;
    }

    .kage-profile-status {
      min-height: 15px;
      color: #666666;
      font-size: 11px;
      margin-top: 9px;
    }

    .kage-profile-file {
      display: none;
    }

    .kage-install-panel {
      position: absolute;
      top: 48px;
      right: 48px;
      width: 290px;
      background: #050505;
      border: 1px solid #171717;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
      color: #ffffff;
      display: none;
      z-index: 1001;
    }

    .kage-install-panel.open {
      display: block;
    }

    .kage-install-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .kage-install-text {
      color: #888888;
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .kage-install-button {
      width: 100%;
      border: 1px solid #181818;
      background: #ffffff;
      color: #000000;
      border-radius: 9px;
      padding: 10px;
      cursor: pointer;
      font-size: 12px;
    }

    .kage-install-close {
      margin-top: 8px;
      width: 100%;
      border: 1px solid #181818;
      background: #090909;
      color: #ffffff;
      border-radius: 9px;
      padding: 9px;
      cursor: pointer;
      font-size: 12px;
    }

    .kage-install-state {
      color: #777777;
      font-size: 11px;
      margin-top: 10px;
      line-height: 1.5;
    }
  `;

  document.head.appendChild(style);
}

function findHeaderMount() {
  const candidates = [
    "[data-kage-header]",
    ".header",
    ".topbar",
    ".top-bar",
    ".navbar",
    ".nav",
    "header"
  ];

  for (const selector of candidates) {
    const element = document.querySelector(selector);

    if (element) {
      return element;
    }
  }

  return document.body;
}

function mountControls() {
  if (document.getElementById("kage-identity-controls")) {
    return;
  }

  injectStyles();

  const header = findHeaderMount();

  const controls = document.createElement("div");

  controls.id = "kage-identity-controls";
  controls.className = "kage-identity-controls";

  const profileButton = document.createElement("button");

  profileButton.type = "button";
  profileButton.className = "kage-icon-button";
  profileButton.id = "kage-profile-button";
  profileButton.title = "Profile";
  profileButton.setAttribute("aria-label", "Profile");

  const downloadButton = document.createElement("button");

  downloadButton.type = "button";
  downloadButton.className = "kage-icon-button";
  downloadButton.id = "kage-download-button";
  downloadButton.title = "Install KAGE";
  downloadButton.setAttribute("aria-label", "Install KAGE");
  downloadButton.textContent = "↓";

  const profilePanel = document.createElement("div");

  profilePanel.id = "kage-profile-panel";
  profilePanel.className = "kage-profile-panel";

  const installPanel = document.createElement("div");

  installPanel.id = "kage-install-panel";
  installPanel.className = "kage-install-panel";

  controls.appendChild(profileButton);
  controls.appendChild(downloadButton);
  controls.appendChild(profilePanel);
  controls.appendChild(installPanel);

  header.appendChild(controls);

  renderProfile();

  profileButton.addEventListener("click", (event) => {
    event.stopPropagation();

    installPanel.classList.remove("open");
    profilePanel.classList.toggle("open");
  });

  downloadButton.addEventListener("click", (event) => {
    event.stopPropagation();

    profilePanel.classList.remove("open");

    openInstallExperience();
  });

  document.addEventListener("click", () => {
    profilePanel.classList.remove("open");
    installPanel.classList.remove("open");
  });

  profilePanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  installPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  window.addEventListener("kage-profile-updated", renderProfile);

  window.addEventListener("appinstalled", () => {
    renderInstallPanel();
  });

  window.addEventListener("beforeinstallprompt", () => {
    renderInstallPanel();
  });
}

function renderProfile() {
  const button = document.getElementById("kage-profile-button");
  const panel = document.getElementById("kage-profile-panel");

  if (!button || !panel) {
    return;
  }

  const profile = loadProfile();

  button.replaceChildren(
    createAvatar(profile, true)
  );

  panel.innerHTML = "";

  const title = document.createElement("div");

  title.className = "kage-profile-title";
  title.textContent = "Profile";

  const preview = document.createElement("div");

  preview.className = "kage-profile-preview";

  preview.appendChild(
    createAvatar(profile)
  );

  const previewText = document.createElement("div");

  previewText.className = "kage-profile-name-preview";

  const name = document.createElement("strong");

  name.textContent =
    profile.nickname || "KAGE user";

  const description = document.createElement("span");

  description.textContent =
    "Your KAGE identity";

  previewText.appendChild(name);
  previewText.appendChild(description);
  preview.appendChild(previewText);

  const label = document.createElement("label");

  label.className = "kage-profile-label";
  label.textContent = "Nickname";

  const input = document.createElement("input");

  input.className = "kage-profile-input";
  input.type = "text";
  input.maxLength = 40;
  input.placeholder = "What should KAGE call you?";
  input.value = profile.nickname;

  const file = document.createElement("input");

  file.className = "kage-profile-file";
  file.type = "file";
  file.accept = "image/*";

  const actions = document.createElement("div");

  actions.className = "kage-profile-actions";

  const photoButton = document.createElement("button");

  photoButton.type = "button";
  photoButton.className = "kage-profile-action";
  photoButton.textContent =
    profile.avatar
      ? "Change photo"
      : "Add photo";

  const removeButton = document.createElement("button");

  removeButton.type = "button";
  removeButton.className = "kage-profile-action";
  removeButton.textContent = "Remove photo";

  const saveButton = document.createElement("button");

  saveButton.type = "button";
  saveButton.className =
    "kage-profile-action primary";
  saveButton.textContent = "Save profile";

  const status = document.createElement("div");

  status.className = "kage-profile-status";

  photoButton.addEventListener("click", () => {
    file.click();
  });

  removeButton.addEventListener("click", () => {
    const current = loadProfile();

    saveProfile({
      ...current,
      avatar: ""
    });

    status.textContent = "Profile photo removed.";
    renderProfile();

    document
      .getElementById("kage-profile-panel")
      ?.classList.add("open");
  });

  file.addEventListener("change", () => {
    const selected = file.files?.[0];

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      status.textContent = "Please choose an image.";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const current = loadProfile();

      saveProfile({
        ...current,
        avatar: String(reader.result || "")
      });

      renderProfile();

      document
        .getElementById("kage-profile-panel")
        ?.classList.add("open");
    };

    reader.readAsDataURL(selected);
  });

  saveButton.addEventListener("click", () => {
    const nickname = input.value.trim();

    const current = loadProfile();

    saveProfile({
      ...current,
      nickname
    });

    status.textContent =
      nickname
        ? `KAGE will call you ${nickname}.`
        : "Nickname cleared.";

    renderProfile();

    document
      .getElementById("kage-profile-panel")
      ?.classList.add("open");
  });

  label.htmlFor = input.id = "kage-nickname-input";

  actions.appendChild(photoButton);
  actions.appendChild(removeButton);

  panel.appendChild(title);
  panel.appendChild(preview);
  panel.appendChild(label);
  panel.appendChild(input);
  panel.appendChild(file);
  panel.appendChild(actions);
  panel.appendChild(saveButton);
  panel.appendChild(status);
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(
    navigator.userAgent
  );
}

function isStandalone() {
  return (
    window.matchMedia?.(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  );
}

function openInstallExperience() {
  const panel = document.getElementById(
    "kage-install-panel"
  );

  if (!panel) {
    return;
  }

  panel.classList.add("open");

  renderInstallPanel();
}

function renderInstallPanel() {
  const panel = document.getElementById(
    "kage-install-panel"
  );

  if (!panel) {
    return;
  }

  panel.innerHTML = "";

  const title = document.createElement("div");

  title.className = "kage-install-title";
  title.textContent = "Install KAGE";

  const text = document.createElement("div");

  text.className = "kage-install-text";

  const installButton =
    document.createElement("button");

  installButton.type = "button";
  installButton.className =
    "kage-install-button";

  const closeButton =
    document.createElement("button");

  closeButton.type = "button";
  closeButton.className =
    "kage-install-close";
  closeButton.textContent = "Close";

  const state =
    document.createElement("div");

  state.className =
    "kage-install-state";

  if (isStandalone()) {
    text.textContent =
      "KAGE is already installed on this device.";

    state.textContent =
      "You are running the installed KAGE app.";

    installButton.style.display = "none";
  } else if (isIOS()) {
    text.textContent =
      "On iPhone or iPad, use your browser's Share menu and choose Add to Home Screen.";

    installButton.style.display = "none";

    state.textContent =
      "Safari and supported iOS browsers use the system Add to Home Screen flow.";
  } else if (window.__kageInstallPrompt) {
    text.textContent =
      "Install KAGE as an app on this device.";

    installButton.textContent =
      "Install KAGE";

    installButton.style.display = "block";

    installButton.addEventListener(
      "click",
      async () => {
        const prompt =
          window.__kageInstallPrompt;

        if (!prompt) {
          renderInstallPanel();
          return;
        }

        try {
          await prompt.prompt();
          await prompt.userChoice;
        } catch {
          // User dismissed or browser rejected the prompt.
        }

        window.__kageInstallPrompt = null;

        renderInstallPanel();
      }
    );
  } else {
    text.textContent =
      "KAGE can be installed when this browser exposes its installation option.";

    installButton.style.display = "none";

    state.textContent =
      "If your browser supports installation, use its browser install control.";
  }

  closeButton.addEventListener("click", () => {
    panel.classList.remove("open");
  });

  panel.appendChild(title);
  panel.appendChild(text);
  panel.appendChild(installButton);
  panel.appendChild(state);
  panel.appendChild(closeButton);
}

window.addEventListener(
  "beforeinstallprompt",
  (event) => {
    event.preventDefault();

    window.__kageInstallPrompt = event;

    renderInstallPanel();
  }
);

window.addEventListener(
  "appinstalled",
  () => {
    window.__kageInstallPrompt = null;

    renderInstallPanel();
  }
);

window.KAGE_PROFILE = {
  get: getProfile,
  getNickname,
  save: saveProfile
};

function startKageIdentity() {
  mountControls();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startKageIdentity,
    { once: true }
  );
} else {
  startKageIdentity();
}
