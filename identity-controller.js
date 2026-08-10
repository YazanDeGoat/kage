import {
  createKageProfileMenu,
  toggleKageProfileMenu,
  getCurrentKageProfile,
} from "./profile-menu.js";

let deferredInstallPrompt = null;
let initialized = false;

function createStyles() {
  if (document.getElementById("kage-identity-controller-styles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "kage-identity-controller-styles";

  style.textContent = `
    .kage-identity-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .kage-identity-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 38px;
      padding: 8px 12px;
      border: 1px solid rgba(128, 128, 128, 0.25);
      border-radius: 10px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .kage-identity-button:hover {
      background: rgba(128, 128, 128, 0.12);
    }

    .kage-identity-icon {
      font-size: 17px;
      line-height: 1;
    }

    .kage-install-dialog {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0.45);
      z-index: 10000;
    }

    .kage-install-dialog[hidden] {
      display: none;
    }

    .kage-install-card {
      width: 100%;
      max-width: 420px;
      padding: 24px;
      border-radius: 20px;
      background: #ffffff;
      color: #111111;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.25);
    }

    .kage-install-title {
      margin: 0 0 8px;
      font-size: 21px;
    }

    .kage-install-text {
      margin: 0 0 18px;
      line-height: 1.5;
      opacity: 0.75;
    }

    .kage-install-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .kage-install-action {
      border: 0;
      border-radius: 10px;
      padding: 11px 15px;
      cursor: pointer;
      font: inherit;
      font-weight: 600;
    }

    .kage-install-close {
      background: #e5e7eb;
      color: #111111;
    }

    @media (max-width: 600px) {
      .kage-identity-button {
        padding: 8px 9px;
      }

      .kage-identity-label {
        display: none;
      }
    }
  `;

  document.head.appendChild(style);
}

function createInstallDialog() {
  const existing = document.getElementById(
    "kage-install-dialog"
  );

  if (existing) {
    return existing;
  }

  const dialog = document.createElement("div");

  dialog.id = "kage-install-dialog";
  dialog.className = "kage-install-dialog";
  dialog.hidden = true;

  dialog.innerHTML = `
    <div
      class="kage-install-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kage-install-title"
    >
      <h2
        id="kage-install-title"
        class="kage-install-title"
      >
        Install KAGE
      </h2>

      <p
        id="kage-install-text"
        class="kage-install-text"
      ></p>

      <div class="kage-install-actions">
        <button
          id="kage-install-action"
          class="kage-install-action"
          type="button"
        >
          Install KAGE
        </button>

        <button
          id="kage-install-close"
          class="kage-install-action kage-install-close"
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  const closeButton = dialog.querySelector(
    "#kage-install-close"
  );

  closeButton.addEventListener("click", () => {
    dialog.hidden = true;
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.hidden = true;
    }
  });

  return dialog;
}

function showInstallDialog() {
  const dialog = createInstallDialog();

  const text = dialog.querySelector(
    "#kage-install-text"
  );

  const installButton = dialog.querySelector(
    "#kage-install-action"
  );

  const isStandalone =
    window.matchMedia?.(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    text.textContent =
      "KAGE is already installed on this device.";

    installButton.hidden = true;
  } else if (deferredInstallPrompt) {
    text.textContent =
      "Install KAGE on this device for a more app-like experience while keeping the KAGE experience and UI.";

    installButton.hidden = false;
  } else {
    text.textContent =
      "Your current browser has not provided KAGE with a direct install prompt. Use your browser's Add to Home Screen or Install App option to install KAGE.";
    
    installButton.hidden = true;
  }

  dialog.hidden = false;

  installButton.onclick = async () => {
    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();

    await deferredInstallPrompt.userChoice;

    deferredInstallPrompt = null;

    dialog.hidden = true;
  };
}

function createIdentityControls() {
  const existing = document.getElementById(
    "kage-identity-controls"
  );

  if (existing) {
    return existing;
  }

  const controls = document.createElement("div");

  controls.id = "kage-identity-controls";
  controls.className = "kage-identity-controls";

  controls.innerHTML = `
    <button
      id="kage-download-button"
      class="kage-identity-button"
      type="button"
      aria-label="Download or install KAGE"
    >
      <span
        class="kage-identity-icon"
        aria-hidden="true"
      >
        ⬇️
      </span>

      <span class="kage-identity-label">
        Download KAGE
      </span>
    </button>

    <button
      id="kage-profile-button"
      class="kage-identity-button"
      type="button"
      aria-label="Open KAGE profile"
      aria-expanded="false"
    >
      <span
        class="kage-identity-icon"
        aria-hidden="true"
      >
        👤
      </span>

      <span class="kage-identity-label">
        Profile
      </span>
    </button>
  `;

  document.body.appendChild(controls);

  const profileButton = controls.querySelector(
    "#kage-profile-button"
  );

  const downloadButton = controls.querySelector(
    "#kage-download-button"
  );

  profileButton.addEventListener("click", () => {
    const menu = toggleKageProfileMenu();

    profileButton.setAttribute(
      "aria-expanded",
      String(!menu.hidden)
    );
  });

  downloadButton.addEventListener("click", () => {
    showInstallDialog();
  });

  createKageProfileMenu();

  return controls;
}

export function initializeKageIdentity() {
  if (initialized) {
    return;
  }

  initialized = true;

  createStyles();

  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();

      deferredInstallPrompt = event;
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {
      deferredInstallPrompt = null;
    }
  );

  createIdentityControls();
}

export function getKageIdentityProfile() {
  return getCurrentKageProfile();
}

export function getKageInstallAvailability() {
  return {
    installPromptAvailable:
      deferredInstallPrompt !== null,

    standalone:
      window.matchMedia?.(
        "(display-mode: standalone)"
      ).matches ||
      window.navigator.standalone === true,
  };
}
