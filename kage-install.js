/*
 * KAGE Install Controller
 * Phase 20
 *
 * Handles:
 * - Chromium/Android PWA installation
 * - iPhone/iPad installation instructions
 * - Desktop installation instructions
 * - Already-installed state
 */

(() => {
  "use strict";

  let deferredInstallPrompt = null;

  const IOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1
    );

  const STANDALONE =
    window.matchMedia?.(
      "(display-mode: standalone)"
    )?.matches ||
    window.navigator.standalone === true;

  function isInstalled() {
    return STANDALONE;
  }

  function isIOS() {
    return IOS;
  }

  function isChromiumInstallAvailable() {
    return Boolean(deferredInstallPrompt);
  }

  function createStyles() {
    if (document.getElementById("kage-install-style")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "kage-install-style";

    style.textContent = `
      .kage-install-overlay {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0,0,0,.66);
        backdrop-filter: blur(8px);
      }

      .kage-install-overlay[hidden] {
        display: none;
      }

      .kage-install-card {
        width: min(420px, 100%);
        background: #111214;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 18px;
        box-shadow: 0 24px 80px rgba(0,0,0,.5);
        padding: 22px;
        color: #fff;
      }

      .kage-install-title {
        font-size: 20px;
        font-weight: 750;
        margin-bottom: 8px;
      }

      .kage-install-description {
        color: rgba(255,255,255,.66);
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 18px;
      }

      .kage-install-instructions {
        background: rgba(255,255,255,.05);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 12px;
        padding: 14px;
        font-size: 14px;
        line-height: 1.55;
        margin-bottom: 18px;
      }

      .kage-install-instructions strong {
        color: #fff;
      }

      .kage-install-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .kage-install-action {
        appearance: none;
        min-height: 42px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.13);
        background: rgba(255,255,255,.06);
        color: #fff;
        padding: 0 14px;
        cursor: pointer;
        font-size: 14px;
      }

      .kage-install-action.primary {
        background: #fff;
        color: #111;
        border-color: #fff;
        font-weight: 700;
      }

      .kage-install-action:hover {
        background: rgba(255,255,255,.11);
      }

      .kage-install-action.primary:hover {
        background: #e8e8e8;
      }
    `;

    document.head.appendChild(style);
  }

  function createOverlay() {
    if (document.getElementById("kage-install-overlay")) {
      return;
    }

    const overlay = document.createElement("div");

    overlay.id = "kage-install-overlay";

    overlay.className = "kage-install-overlay";

    overlay.hidden = true;

    overlay.innerHTML = `
      <div
        class="kage-install-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kage-install-title"
      >
        <div
          id="kage-install-title"
          class="kage-install-title"
        >
          Install KAGE
        </div>

        <div
          id="kage-install-description"
          class="kage-install-description"
        ></div>

        <div
          id="kage-install-instructions"
          class="kage-install-instructions"
        ></div>

        <div class="kage-install-actions">
          <button
            id="kage-install-now"
            class="kage-install-action primary"
            type="button"
          >
            Install KAGE
          </button>

          <button
            id="kage-install-close"
            class="kage-install-action"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document
      .getElementById("kage-install-close")
      .addEventListener("click", close);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        close();
      }
    });

    document
      .getElementById("kage-install-now")
      .addEventListener("click", install);
  }

  function setContent() {
    const description = document.getElementById(
      "kage-install-description"
    );

    const instructions = document.getElementById(
      "kage-install-instructions"
    );

    const installButton = document.getElementById(
      "kage-install-now"
    );

    if (!description || !instructions || !installButton) {
      return;
    }

    if (isInstalled()) {
      description.textContent =
        "KAGE is already installed on this device.";

      instructions.innerHTML =
        "<strong>You're all set.</strong><br>" +
        "Open KAGE from your Home Screen or installed apps.";

      installButton.hidden = true;

      return;
    }

    if (isChromiumInstallAvailable()) {
      description.textContent =
        "Install KAGE as an app for a faster, app-like experience.";

      instructions.innerHTML =
        "<strong>Ready to install.</strong><br>" +
        "Tap Install KAGE and your browser will add KAGE to your device.";

      installButton.hidden = false;

      return;
    }

    if (isIOS()) {
      description.textContent =
        "KAGE can be added to your iPhone or iPad Home Screen.";

      instructions.innerHTML =
        "<strong>Safari:</strong><br>" +
        "1. Open KAGE in Safari.<br>" +
        "2. Tap the Share button.<br>" +
        "3. Choose <strong>Add to Home Screen</strong>.<br>" +
        "4. Tap Add.";

      installButton.hidden = true;

      return;
    }

    description.textContent =
      "KAGE can be installed from a supported browser.";

    instructions.innerHTML =
      "<strong>Desktop:</strong><br>" +
      "Look for the browser's install icon in the address bar or browser menu and choose the option to install KAGE.";

    installButton.hidden = true;
  }

  async function install() {
    if (!deferredInstallPrompt) {
      setContent();

      return;
    }

    try {
      deferredInstallPrompt.prompt();

      const result =
        await deferredInstallPrompt.userChoice;

      if (result?.outcome === "accepted") {
        deferredInstallPrompt = null;

        close();
      }
    } catch {
      setContent();
    }
  }

  function open() {
    createStyles();

    createOverlay();

    setContent();

    const overlay = document.getElementById(
      "kage-install-overlay"
    );

    if (overlay) {
      overlay.hidden = false;
    }
  }

  function close() {
    const overlay = document.getElementById(
      "kage-install-overlay"
    );

    if (overlay) {
      overlay.hidden = true;
    }
  }

  window.addEventListener(
    "beforeinstallprompt",
    event => {
      event.preventDefault();

      deferredInstallPrompt = event;

      window.dispatchEvent(
        new CustomEvent(
          "kage:install-available"
        )
      );
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {
      deferredInstallPrompt = null;

      const overlay = document.getElementById(
        "kage-install-overlay"
      );

      if (overlay) {
        setContent();
      }
    }
  );

  window.addEventListener(
    "kage:install-requested",
    open
  );

  window.KAGEInstall = {
    open,
    close,
    install,
    isInstalled,
    isIOS,
    isChromiumInstallAvailable
  };

  function initialize() {
    createStyles();

    createOverlay();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
