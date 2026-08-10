/*
 * KAGE Identity + Install UI
 *
 * Root-level integration layer.
 * Does not replace the existing KAGE runtime.
 *
 * Responsibilities:
 * - Visible Profile control
 * - Profile editor
 * - Persistent nickname
 * - Persistent avatar
 * - Avatar removal
 * - Exposes profile data to KAGE through window.KAGE_PROFILE
 * - Visible professional install/download icon
 * - Chromium beforeinstallprompt support
 * - iPhone/iPad Add to Home Screen instructions
 * - Desktop install instructions
 * - Installed-state detection
 */
(() => {
  "use strict";
  const PROFILE_STORAGE_KEY = "kage.profile";
  let deferredInstallPrompt = null;
  const defaultProfile = {
    nickname: "",
    avatar: ""
  };
  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) {
        return { ...defaultProfile };
      }
      const parsed = JSON.parse(raw);
      return {
        nickname:
          typeof parsed.nickname === "string"
            ? parsed.nickname.slice(0, 40)
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
    window.KAGE_PROFILE = { ...cleanProfile };
    window.dispatchEvent(
      new CustomEvent("kage:profile-updated", {
        detail: { ...cleanProfile }
      })
    );
    return cleanProfile;
  }
  function exposeProfile() {
    const profile = loadProfile();
    window.KAGE_PROFILE = {
      nickname: profile.nickname,
      avatar: profile.avatar,
      get: () => loadProfile(),
      save: saveProfile
    };
    return profile;
  }
  function isStandalone() {
    return (
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches
    ) || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(
      window.navigator.userAgent || ""
    );
  }
  function isMacSafari() {
    const ua = window.navigator.userAgent || "";
    return (
      /macintosh/i.test(ua) &&
      /safari/i.test(ua) &&
      !/chrome|chromium|android/i.test(ua)
    );
  }
  function isChromiumLike() {
    const ua = window.navigator.userAgent || "";
    return /chrome|chromium|edg|opr|brave/i.test(ua);
  }
  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }
  function createDownloadIcon() {
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    path.setAttribute(
      "d",
      "M12 3v11m0 0 4-4m-4 4-4-4M5 19h14"
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }
  function findHeader() {
    const selectors = [
      "header",
      ".header",
      ".topbar",
      ".topBar",
      ".navbar",
      ".nav",
      ".chatHeader",
      ".chat-header",
      ".top-header",
      ".appHeader",
      ".app-header"
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }
  function createFallbackMount() {
    const mount = createElement(
      "div",
      "kage-identity-fallback-mount"
    );
    document.body.appendChild(mount);
    return mount;
  }
  function createControlsMount() {
    const existing = document.getElementById(
      "kageIdentityControls"
    );
    if (existing) {
      return existing;
    }
    const header = findHeader();
    const mount = createElement(
      "div",
      "kage-identity-controls"
    );
    mount.id = "kageIdentityControls";
    if (header) {
      header.appendChild(mount);
    } else {
      createFallbackMount().appendChild(mount);
    }
    return mount;
  }
  function createProfileButton(profile) {
    const button = createElement(
      "button",
      "kage-profile-button"
    );
    button.type = "button";
    button.setAttribute("aria-label", "Open profile");
    button.setAttribute("title", "Profile");
    const avatar = createElement(
      "span",
      "kage-profile-button-avatar"
    );
    if (profile.avatar) {
      avatar.style.backgroundImage =
        `url("${profile.avatar}")`;
      avatar.textContent = "";
    } else {
      avatar.textContent = "👤";
    }
    const label = createElement(
      "span",
      "kage-profile-button-label",
      profile.nickname || "Profile"
    );
    button.appendChild(avatar);
    button.appendChild(label);
    return button;
  }
  function createInstallButton() {
    const button = createElement(
      "button",
      "kage-install-button"
    );
    button.type = "button";
    button.setAttribute(
      "aria-label",
      "Install KAGE"
    );
    button.setAttribute(
      "title",
      "Install KAGE"
    );
    button.appendChild(createDownloadIcon());
    return button;
  }
  function closeAllMenus() {
    document
      .querySelectorAll(".kage-profile-menu, .kage-install-menu")
      .forEach((element) => {
        element.remove();
      });
  }
  function createProfileMenu(profile, onUpdate) {
    closeAllMenus();
    const menu = createElement(
      "div",
      "kage-profile-menu"
    );
    menu.id = "kageProfileMenu";
    const title = createElement(
      "div",
      "kage-profile-title",
      "Profile"
    );
    menu.appendChild(title);
    const avatarSection = createElement(
      "div",
      "kage-profile-avatar-section"
    );
    const avatarPreview = createElement(
      "div",
      "kage-profile-avatar-preview"
    );
    if (profile.avatar) {
      avatarPreview.style.backgroundImage =
        `url("${profile.avatar}")`;
    } else {
      avatarPreview.textContent = "👤";
    }
    avatarSection.appendChild(avatarPreview);
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;
    const uploadButton = createElement(
      "button",
      "kage-profile-secondary-button",
      profile.avatar
        ? "Change profile picture"
        : "Edit profile picture"
    );
    uploadButton.type = "button";
    uploadButton.addEventListener(
      "click",
      () => fileInput.click()
    );
    fileInput.addEventListener(
      "change",
      () => {
        const file = fileInput.files?.[0];
        if (!file) {
          return;
        }
        if (!file.type.startsWith("image/")) {
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert("Profile pictures must be 5 MB or smaller.");
          fileInput.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const nextProfile = saveProfile({
            ...loadProfile(),
            avatar:
              typeof reader.result === "string"
                ? reader.result
                : ""
          });
          avatarPreview.style.backgroundImage =
            nextProfile.avatar
              ? `url("${nextProfile.avatar}")`
              : "";
          avatarPreview.textContent =
            nextProfile.avatar ? "" : "👤";
          uploadButton.textContent =
            "Change profile picture";
          onUpdate(nextProfile);
        };
        reader.readAsDataURL(file);
      }
    );
    const removeButton = createElement(
      "button",
      "kage-profile-secondary-button",
      "Remove profile picture"
    );
    removeButton.type = "button";
    removeButton.addEventListener(
      "click",
      () => {
        const nextProfile = saveProfile({
          ...loadProfile(),
          avatar: ""
        });
        avatarPreview.style.backgroundImage = "";
        avatarPreview.textContent = "👤";
        uploadButton.textContent =
          "Edit profile picture";
        onUpdate(nextProfile);
      }
    );
    avatarSection.appendChild(uploadButton);
    avatarSection.appendChild(removeButton);
    avatarSection.appendChild(fileInput);
    menu.appendChild(avatarSection);
    const nicknameLabel = createElement(
      "label",
      "kage-profile-label",
      "Nickname"
    );
    const nicknameInput = document.createElement("input");
    nicknameInput.type = "text";
    nicknameInput.maxLength = 40;
    nicknameInput.autocomplete = "nickname";
    nicknameInput.placeholder = "What should KAGE call you?";
    nicknameInput.value = profile.nickname;
    nicknameLabel.appendChild(nicknameInput);
    menu.appendChild(nicknameLabel);
    const saveButton = createElement(
      "button",
      "kage-profile-save-button",
      "Save profile"
    );
    saveButton.type = "button";
    saveButton.addEventListener(
      "click",
      () => {
        const nextProfile = saveProfile({
          ...loadProfile(),
          nickname: nicknameInput.value
        });
        onUpdate(nextProfile);
        closeAllMenus();
      }
    );
    menu.appendChild(saveButton);
    const closeButton = createElement(
      "button",
      "kage-profile-close-button",
      "Close"
    );
    closeButton.type = "button";
    closeButton.addEventListener(
      "click",
      closeAllMenus
    );
    menu.appendChild(closeButton);
    document.body.appendChild(menu);
    requestAnimationFrame(() => {
      const button =
        document.querySelector(".kage-profile-button");
      if (!button) {
        return;
      }
      const rect = button.getBoundingClientRect();
      menu.style.top =
        `${Math.round(rect.bottom + 8)}px`;
      menu.style.right =
        `${Math.max(
          12,
          Math.round(window.innerWidth - rect.right)
        )}px`;
    });
  }
  function createInstallMenu() {
    closeAllMenus();
    const menu = createElement(
      "div",
      "kage-install-menu"
    );
    menu.id = "kageInstallMenu";
    const title = createElement(
      "div",
      "kage-install-title",
      "Install KAGE"
    );
    menu.appendChild(title);
    if (isStandalone()) {
      const installed = createElement(
        "div",
        "kage-install-status",
        "✓ KAGE is already installed"
      );
      menu.appendChild(installed);
    } else if (deferredInstallPrompt) {
      const installButton = createElement(
        "button",
        "kage-install-primary-button",
        "Install KAGE"
      );
      installButton.type = "button";
      installButton.addEventListener(
        "click",
        async () => {
          try {
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            closeAllMenus();
          } catch {
            closeAllMenus();
          }
        }
      );
      menu.appendChild(installButton);
      const supportedText = createElement(
        "div",
        "kage-install-help",
        "Your browser supports the KAGE install prompt."
      );
      menu.appendChild(supportedText);
    } else if (isIOS()) {
      const instructions = createElement(
        "div",
        "kage-install-instructions"
      );
      instructions.innerHTML =
        "<strong>iPhone / iPad</strong>" +
        "<br><br>" +
        "1. Tap the Share button in Safari." +
        "<br>" +
        "2. Choose <strong>Add to Home Screen</strong>." +
        "<br>" +
        "3. Tap <strong>Add</strong>.";
      menu.appendChild(instructions);
    } else if (isMacSafari()) {
      const instructions = createElement(
        "div",
        "kage-install-instructions"
      );
      instructions.innerHTML =
        "<strong>Safari</strong>" +
        "<br><br>" +
        "Use Safari's Share menu and choose " +
        "<strong>Add to Dock</strong> when available.";
      menu.appendChild(instructions);
    } else {
      const instructions = createElement(
        "div",
        "kage-install-instructions"
      );
      instructions.innerHTML =
        "<strong>Install KAGE</strong>" +
        "<br><br>" +
        "Open your browser's menu and look for " +
        "<strong>Install KAGE</strong>, " +
        "<strong>Install app</strong>, or " +
        "<strong>Add to Home screen</strong>.";
      menu.appendChild(instructions);
      if (isChromiumLike()) {
        const help = createElement(
          "div",
          "kage-install-help",
          "If the browser has not exposed its install prompt yet, refresh KAGE after the page finishes loading."
        );
        menu.appendChild(help);
      }
    }
    const closeButton = createElement(
      "button",
      "kage-install-close-button",
      "Close"
    );
    closeButton.type = "button";
    closeButton.addEventListener(
      "click",
      closeAllMenus
    );
    menu.appendChild(closeButton);
    document.body.appendChild(menu);
    requestAnimationFrame(() => {
      const button =
        document.querySelector(".kage-install-button");
      if (!button) {
        return;
      }
      const rect = button.getBoundingClientRect();
      menu.style.top =
        `${Math.round(rect.bottom + 8)}px`;
      menu.style.right =
        `${Math.max(
          12,
          Math.round(window.innerWidth - rect.right)
        )}px`;
    });
  }
  function mount() {
    if (
      document.getElementById("kageIdentityControls")
    ) {
      return;
    }
    const profile = exposeProfile();
    const mountPoint = createControlsMount();
    const installButton = createInstallButton();
    const profileButton =
      createProfileButton(profile);
    mountPoint.appendChild(installButton);
    mountPoint.appendChild(profileButton);
    installButton.addEventListener(
      "click",
      createInstallMenu
    );
    profileButton.addEventListener(
      "click",
      () => {
        createProfileMenu(
          loadProfile(),
          (nextProfile) => {
            const avatar =
              profileButton.querySelector(
                ".kage-profile-button-avatar"
              );
            const label =
              profileButton.querySelector(
                ".kage-profile-button-label"
              );
            if (avatar) {
              avatar.style.backgroundImage =
                nextProfile.avatar
                  ? `url("${nextProfile.avatar}")`
                  : "";
              avatar.textContent =
                nextProfile.avatar
                  ? ""
                  : "👤";
            }
            if (label) {
              label.textContent =
                nextProfile.nickname || "Profile";
            }
          }
        );
      }
    );
  }
  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      const button =
        document.querySelector(".kage-install-button");
      if (button) {
        button.setAttribute(
          "title",
          "Install KAGE"
        );
      }
    }
  );
  window.addEventListener(
    "appinstalled",
    () => {
      deferredInstallPrompt = null;
      closeAllMenus();
    }
  );
  window.addEventListener(
    "kage:profile-updated",
    (event) => {
      window.KAGE_PROFILE = {
        ...(event.detail || {})
      };
    }
  );
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (
        target.closest(".kage-profile-menu") ||
        target.closest(".kage-install-menu") ||
        target.closest(".kage-profile-button") ||
        target.closest(".kage-install-button")
      ) {
        return;
      }
      closeAllMenus();
    }
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
   * KAGE can read the current identity at any time:
   *
   * window.KAGE_PROFILE.nickname
   * window.KAGE_PROFILE.avatar
   */
})();
