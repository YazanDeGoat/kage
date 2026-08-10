/* =========================================================
   KAGE INSTALL CONTROLLER
   ========================================================= */

(() => {
  "use strict";

  let deferredInstallPrompt = null;

  const INSTALL_BUTTON_SELECTORS = [
    "#downloadButton",
    "#download-button",
    "#kageDownload",
    "#kage-download",
    ".downloadButton",
    ".download-button",
    "[data-kage-install]"
  ];

  function getInstallButton() {
    for (const selector of INSTALL_BUTTON_SELECTORS) {
      const button = document.querySelector(selector);

      if (button) {
        return button;
      }
    }

    return null;
  }

  function isStandalone() {
    return (
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches
    ) || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function isChromium() {
    return /Chrome|Chromium|Edg|OPR/i.test(navigator.userAgent);
  }

  function showMessage(title, message) {
    const existing = document.getElementById("kageInstallDialog");

    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement("div");

    overlay.id = "kageInstallDialog";

    overlay.innerHTML = `
      <div
        style="
          position:fixed;
          inset:0;
          z-index:99999;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          background:rgba(0,0,0,.62);
          backdrop-filter:blur(12px);
          -webkit-backdrop-filter:blur(12px);
        "
      >
        <div
          style="
            width:min(420px,100%);
            padding:24px;
            border-radius:22px;
            background:rgba(22,22,24,.94);
            border:1px solid rgba(255,255,255,.14);
            box-shadow:0 30px 90px rgba(0,0,0,.55);
            color:#fff;
            font-family:-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;
          "
        >
          <div
            style="
              font-size:20px;
              font-weight:700;
              margin-bottom:10px;
            "
          >
            ${escapeHTML(title)}
          </div>

          <div
            style="
              color:#b8b8b8;
              font-size:15px;
              line-height:1.55;
              white-space:pre-line;
            "
          >
            ${escapeHTML(message)}
          </div>

          <button
            id="kageInstallClose"
            style="
              width:100%;
              margin-top:20px;
              height:46px;
              border-radius:14px;
              border:1px solid rgba(255,255,255,.14);
              background:rgba(255,255,255,.08);
              color:#fff;
              font-weight:600;
              cursor:pointer;
            "
          >
            Done
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document
      .getElementById("kageInstallClose")
      ?.addEventListener("click", () => {
        overlay.remove();
      });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay.firstElementChild) {
        overlay.remove();
      }
    });
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function installKage() {
    if (isStandalone()) {
      showMessage(
        "KAGE is already installed",
        "KAGE is already running as an installed app on this device."
      );

      return;
    }

    /*
     * Chromium / Android / compatible desktop browsers
     *
     * beforeinstallprompt is the real browser installation flow.
     */

    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();

        const result = await deferredInstallPrompt.userChoice;

        if (result?.outcome === "accepted") {
          deferredInstallPrompt = null;
          updateButton();
        }

        return;
      } catch (error) {
        console.error("KAGE install prompt failed:", error);
      }
    }

    /*
     * iPhone / iPad Safari
     */

    if (isIOS()) {
      showMessage(
        "Install KAGE on iPhone / iPad",
        "1. Tap the Share button in Safari.\n\n2. Choose “Add to Home Screen”.\n\n3. Tap “Add”.\n\nKAGE will then open like an installed app."
      );

      return;
    }

    /*
     * Desktop browsers without beforeinstallprompt
     */

    if (!isAndroid()) {
      showMessage(
        "Install KAGE",
        "Your browser does not currently expose the automatic install prompt.\n\nOpen the browser menu and look for “Install KAGE”, “Install app”, or “Add to Home Screen”."
      );

      return;
    }

    showMessage(
      "Install KAGE",
      "Open your browser menu and choose “Install app” or “Add to Home screen”."
    );
  }

  function updateButton() {
    const button = getInstallButton();

    if (!button) {
      return;
    }

    if (isStandalone()) {
      button.setAttribute("aria-label", "KAGE is installed");
      button.setAttribute("title", "KAGE is already installed");
      button.dataset.installed = "true";

      return;
    }

    button.setAttribute("aria-label", "Install KAGE");
    button.setAttribute("title", "Install KAGE");
    button.dataset.installed = "false";
  }

  function bindButton() {
    const button = getInstallButton();

    if (!button) {
      return false;
    }

    if (button.dataset.kageInstallBound === "true") {
      return true;
    }

    button.dataset.kageInstallBound = "true";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      installKage();
    });

    updateButton();

    return true;
  }

  /*
   * Browser tells us the app is installable.
   */

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();

    deferredInstallPrompt = event;

    updateButton();

    bindButton();
  });

  /*
   * Browser tells us installation finished.
   */

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;

    updateButton();

    console.log("KAGE installed successfully.");
  });

  /*
   * Bind immediately if the button already exists.
   */

  bindButton();

  /*
   * The KAGE UI may mount dynamically.
   * This observer ONLY looks for the install button and then disconnects.
   */

  const observer = new MutationObserver(() => {
    if (bindButton()) {
      observer.disconnect();
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        bindButton();

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      },
      { once: true }
    );
  }

  window.KAGEInstall = {
    install: installKage,
    isInstalled: isStandalone
  };
})();
