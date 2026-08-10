(() => {
  "use strict";

  const PROFILE_KEY = "kage.profile";

  const SVG = {
    user: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M4 21c0-4.1 3.6-7 8-7s8 2.9 8 7"></path>
      </svg>
    `,
    download: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M4 21h16"></path>
      </svg>
    `,
    camera: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h3l2-2h6l2 2h3v12H4z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
    `
  };

  function readProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) {
        return {
          nickname: "",
          avatar: ""
        };
      }

      const parsed = JSON.parse(raw);

      return {
        nickname: typeof parsed.nickname === "string"
          ? parsed.nickname
          : "",
        avatar: typeof parsed.avatar === "string"
          ? parsed.avatar
          : ""
      };
    } catch {
      return {
        nickname: "",
        avatar: ""
      };
    }
  }

  function saveProfile(profile) {
    const clean = {
      nickname: String(profile.nickname || "").trim().slice(0, 40),
      avatar: typeof profile.avatar === "string"
        ? profile.avatar
        : ""
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));

    window.KAGE_IDENTITY = {
      nickname: clean.nickname,
      avatar: clean.avatar
    };

    window.dispatchEvent(
      new CustomEvent("kageidentitychange", {
        detail: clean
      })
    );

    return clean;
  }

  function syncIdentity() {
    const profile = readProfile();

    window.KAGE_IDENTITY = {
      nickname: profile.nickname,
      avatar: profile.avatar
    };

    return profile;
  }

  function avatarMarkup(profile) {
    if (profile.avatar) {
      return `
        <img
          src="${profile.avatar}"
          alt="Profile picture"
          class="kage-profile-avatar-image"
        >
      `;
    }

    return SVG.user;
  }

  function findHeader() {
    const selectors = [
      "header",
      ".header",
      ".topbar",
      ".top-bar",
      ".navbar",
      ".nav",
      ".appHeader",
      ".app-header",
      ".chatHeader",
      ".chat-header"
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return document.body;
  }

  function findExistingDownloadButton() {
    const elements = document.querySelectorAll(
      "button, a, [role='button']"
    );

    for (const element of elements) {
      const text = (element.textContent || "").trim().toLowerCase();
      const label = (
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        ""
      ).trim().toLowerCase();

      if (
        text.includes("download kage") ||
        text === "download" ||
        label.includes("download kage") ||
        label === "download"
      ) {
        return element;
      }
    }

    return null;
  }

  function findExistingProfileButton() {
    const elements = document.querySelectorAll(
      "button, a, [role='button']"
    );

    for (const element of elements) {
      const text = (element.textContent || "").trim().toLowerCase();
      const label = (
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        ""
      ).trim().toLowerCase();

      if (
        text === "profile" ||
        label === "profile" ||
        label.includes("profile")
      ) {
        return element;
      }
    }

    return null;
  }

  function styleButton(button) {
    button.classList.add("kage-identity-header-button");

    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.width = "40px";
    button.style.height = "40px";
    button.style.padding = "0";
    button.style.border = "0";
    button.style.borderRadius = "12px";
    button.style.background = "transparent";
    button.style.cursor = "pointer";
    button.style.flexShrink = "0";
    button.style.color = "inherit";
    button.style.position = "relative";
  }

  function createButton(kind) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "kage-identity-header-button";

    styleButton(button);

    if (kind === "download") {
      button.id = "kageDownloadButton";
      button.setAttribute("aria-label", "Download KAGE");
      button.title = "Download KAGE";
      button.innerHTML = SVG.download;
    } else {
      button.id = "kageProfileButton";
      button.setAttribute("aria-label", "Profile");
      button.title = "Profile";
    }

    return button;
  }

  function updateProfileButton(button, profile) {
    if (!button) return;

    button.id = "kageProfileButton";
    button.setAttribute("aria-label", "Profile");
    button.title = profile.nickname
      ? `Profile: ${profile.nickname}`
      : "Profile";

    button.innerHTML = avatarMarkup(profile);

    styleButton(button);

    const image = button.querySelector(
      ".kage-profile-avatar-image"
    );

    if (image) {
      image.style.width = "30px";
      image.style.height = "30px";
      image.style.borderRadius = "50%";
      image.style.objectFit = "cover";
    }

    const svg = button.querySelector("svg");

    if (svg) {
      svg.style.width = "22px";
      svg.style.height = "22px";
      svg.style.fill = "none";
      svg.style.stroke = "currentColor";
      svg.style.strokeWidth = "1.8";
      svg.style.strokeLinecap = "round";
      svg.style.strokeLinejoin = "round";
    }
  }

  function updateDownloadButton(button) {
    if (!button) return;

    button.id = "kageDownloadButton";
    button.setAttribute("aria-label", "Download KAGE");
    button.title = "Download KAGE";

    button.innerHTML = SVG.download;

    styleButton(button);

    const svg = button.querySelector("svg");

    if (svg) {
      svg.style.width = "22px";
      svg.style.height = "22px";
      svg.style.fill = "none";
      svg.style.stroke = "currentColor";
      svg.style.strokeWidth = "1.8";
      svg.style.strokeLinecap = "round";
      svg.style.strokeLinejoin = "round";
    }
  }

  function makeModal() {
    const overlay = document.createElement("div");

    overlay.id = "kageProfileOverlay";

    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "99999";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = "rgba(0,0,0,.55)";
    overlay.style.backdropFilter = "blur(8px)";
    overlay.style.padding = "20px";
    overlay.style.boxSizing = "border-box";

    overlay.innerHTML = `
      <div
        id="kageProfileModal"
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
        style="
          width:min(420px,100%);
          box-sizing:border-box;
          background:#111;
          color:#fff;
          border:1px solid rgba(255,255,255,.10);
          border-radius:22px;
          padding:22px;
          box-shadow:0 25px 80px rgba(0,0,0,.45);
          font-family:inherit;
        "
      >
        <div
          style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            margin-bottom:20px;
          "
        >
          <div>
            <div style="font-size:20px;font-weight:700;">
              Profile
            </div>
            <div style="font-size:13px;opacity:.6;margin-top:4px;">
              Customize how KAGE knows you.
            </div>
          </div>

          <button
            id="kageProfileClose"
            type="button"
            aria-label="Close profile"
            style="
              width:36px;
              height:36px;
              border:0;
              border-radius:10px;
              background:rgba(255,255,255,.07);
              color:#fff;
              font-size:20px;
              cursor:pointer;
            "
          >×</button>
        </div>

        <div
          style="
            display:flex;
            justify-content:center;
            margin-bottom:20px;
          "
        >
          <div style="position:relative;">
            <div
              id="kageProfilePreview"
              style="
                width:92px;
                height:92px;
                border-radius:50%;
                overflow:hidden;
                display:flex;
                align-items:center;
                justify-content:center;
                background:rgba(255,255,255,.08);
              "
            ></div>

            <button
              id="kageAvatarUploadButton"
              type="button"
              title="Change profile picture"
              aria-label="Change profile picture"
              style="
                position:absolute;
                right:-4px;
                bottom:-4px;
                width:36px;
                height:36px;
                border:2px solid #111;
                border-radius:50%;
                background:#fff;
                color:#111;
                display:flex;
                align-items:center;
                justify-content:center;
                cursor:pointer;
              "
            >
              ${SVG.camera}
            </button>
          </div>
        </div>

        <input
          id="kageAvatarInput"
          type="file"
          accept="image/*"
          style="display:none;"
        >

        <button
          id="kageAvatarRemove"
          type="button"
          style="
            width:100%;
            border:0;
            border-radius:12px;
            padding:11px 14px;
            background:rgba(255,255,255,.07);
            color:#fff;
            cursor:pointer;
            margin-bottom:18px;
          "
        >
          Remove profile picture
        </button>

        <label
          for="kageNicknameInput"
          style="
            display:block;
            font-size:13px;
            opacity:.75;
            margin-bottom:7px;
          "
        >
          Nickname
        </label>

        <input
          id="kageNicknameInput"
          type="text"
          maxlength="40"
          autocomplete="nickname"
          placeholder="What should KAGE call you?"
          style="
            width:100%;
            box-sizing:border-box;
            padding:13px 14px;
            border-radius:12px;
            border:1px solid rgba(255,255,255,.12);
            outline:none;
            background:rgba(255,255,255,.06);
            color:#fff;
            font:inherit;
            margin-bottom:16px;
          "
        >

        <button
          id="kageProfileSave"
          type="button"
          style="
            width:100%;
            border:0;
            border-radius:12px;
            padding:13px 16px;
            background:#fff;
            color:#111;
            font-weight:700;
            cursor:pointer;
          "
        >
          Save profile
        </button>

        <div
          id="kageProfileStatus"
          aria-live="polite"
          style="
            min-height:18px;
            margin-top:10px;
            font-size:12px;
            text-align:center;
            opacity:.65;
          "
        ></div>
      </div>
    `;

    document.body.appendChild(overlay);

    return overlay;
  }

  function openProfile(overlay) {
    const profile = readProfile();

    const nickname = overlay.querySelector(
      "#kageNicknameInput"
    );

    const preview = overlay.querySelector(
      "#kageProfilePreview"
    );

    const status = overlay.querySelector(
      "#kageProfileStatus"
    );

    nickname.value = profile.nickname;

    if (profile.avatar) {
      preview.innerHTML = `
        <img
          src="${profile.avatar}"
          alt="Profile preview"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
          "
        >
      `;
    } else {
      preview.innerHTML = SVG.user;

      const svg = preview.querySelector("svg");

      if (svg) {
        svg.style.width = "42px";
        svg.style.height = "42px";
        svg.style.fill = "none";
        svg.style.stroke = "currentColor";
        svg.style.strokeWidth = "1.5";
        svg.style.strokeLinecap = "round";
        svg.style.strokeLinejoin = "round";
      }
    }

    status.textContent = "";

    overlay.style.display = "flex";

    setTimeout(() => nickname.focus(), 0);
  }

  function closeProfile(overlay) {
    overlay.style.display = "none";
  }

  function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(file);
    });
  }

  async function setup() {
    syncIdentity();

    const header = findHeader();

    let downloadButton =
      document.getElementById("kageDownloadButton") ||
      findExistingDownloadButton();

    let profileButton =
      document.getElementById("kageProfileButton") ||
      findExistingProfileButton();

    if (!downloadButton) {
      downloadButton = createButton("download");
      header.appendChild(downloadButton);
    }

    if (!profileButton) {
      profileButton = createButton("profile");
      header.appendChild(profileButton);
    }

    updateDownloadButton(downloadButton);
    updateProfileButton(profileButton, readProfile());

    const overlay = document.getElementById(
      "kageProfileOverlay"
    ) || makeModal();

    const freshProfileButton =
      document.getElementById("kageProfileButton");

    const freshDownloadButton =
      document.getElementById("kageDownloadButton");

    if (freshProfileButton) {
      freshProfileButton.onclick = () => {
        openProfile(overlay);
      };
    }

    if (freshDownloadButton) {
      freshDownloadButton.onclick = async () => {
        if (
          window.KAGE_INSTALL &&
          typeof window.KAGE_INSTALL.open === "function"
        ) {
          await window.KAGE_INSTALL.open();
          return;
        }

        if (
          window.KAGE_INSTALL &&
          typeof window.KAGE_INSTALL.promptInstall === "function"
        ) {
          await window.KAGE_INSTALL.promptInstall();
          return;
        }

        if (
          typeof window.kageInstall === "function"
        ) {
          await window.kageInstall();
          return;
        }

        window.dispatchEvent(
          new CustomEvent("kageinstallrequest")
        );
      };
    }

    const closeButton = overlay.querySelector(
      "#kageProfileClose"
    );

    const avatarUploadButton = overlay.querySelector(
      "#kageAvatarUploadButton"
    );

    const avatarInput = overlay.querySelector(
      "#kageAvatarInput"
    );

    const avatarRemove = overlay.querySelector(
      "#kageAvatarRemove"
    );

    const saveButton = overlay.querySelector(
      "#kageProfileSave"
    );

    const status = overlay.querySelector(
      "#kageProfileStatus"
    );

    closeButton.onclick = () => closeProfile(overlay);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        closeProfile(overlay);
      }
    });

    avatarUploadButton.onclick = () => {
      avatarInput.click();
    };

    avatarInput.onchange = async () => {
      const file = avatarInput.files?.[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        status.textContent = "Please choose an image.";
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        status.textContent = "Image must be 8 MB or smaller.";
        return;
      }

      try {
        const avatar = await readImageAsDataUrl(file);

        const current = readProfile();

        saveProfile({
          nickname: current.nickname,
          avatar
        });

        openProfile(overlay);

        status.textContent = "Profile picture selected.";
      } catch {
        status.textContent =
          "Could not read that image.";
      }

      avatarInput.value = "";
    };

    avatarRemove.onclick = () => {
      const current = readProfile();

      saveProfile({
        nickname: current.nickname,
        avatar: ""
      });

      openProfile(overlay);

      status.textContent =
        "Profile picture removed.";
    };

    saveButton.onclick = () => {
      const nicknameInput = overlay.querySelector(
        "#kageNicknameInput"
      );

      const current = readProfile();

      const saved = saveProfile({
        nickname: nicknameInput.value,
        avatar: current.avatar
      });

      updateProfileButton(
        document.getElementById("kageProfileButton"),
        saved
      );

      status.textContent = "Profile saved.";

      setTimeout(() => {
        closeProfile(overlay);
      }, 500);
    };

    window.addEventListener(
      "kageidentitychange",
      event => {
        updateProfileButton(
          document.getElementById("kageProfileButton"),
          event.detail || readProfile()
        );
      }
    );

    window.KAGE_PROFILE = {
      get: readProfile,
      save: saveProfile,
      clearAvatar() {
        const profile = readProfile();

        return saveProfile({
          nickname: profile.nickname,
          avatar: ""
        });
      }
    };
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      setup,
      { once: true }
    );
  } else {
    setup();
  }
})();
