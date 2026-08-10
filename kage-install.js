(() => {
  "use strict";

  const MANIFEST_URL = "/manifest.json";
  const SERVICE_WORKER_URL = "/sw.js";

  let deferredInstallPrompt = null;

  function addManifestLink() {
    if (document.querySelector('link[rel="manifest"]')) {
      return;
    }

    const link = document.createElement("link");

    link.rel = "manifest";
    link.href = MANIFEST_URL;

    document.head.appendChild(link);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(SERVICE_WORKER_URL, {
          scope: "/"
        })
        .then((registration) => {
          console.log(
            "[KAGE] service worker registered",
            registration.scope
          );
        })
        .catch((error) => {
          console.error(
            "[KAGE] service worker registration failed",
            error
          );
        });
    });
  }

  function createInstallButton() {
    if (document.getElementById("kage-install-button")) {
      return;
    }

    const button = document.createElement("button");

    button.id = "kage-install-button";
    button.type = "button";
    button.textContent = "download kage";
    button.hidden = true;

    button.style.position = "fixed";
    button.style.right = "18px";
    button.style.bottom = "18px";
    button.style.zIndex = "999999";
    button.style.padding = "12px 16px";
    button.style.border = "1px solid #2a2a2a";
    button.style.borderRadius = "999px";
    button.style.background = "#050505";
    button.style.color = "#ffffff";
    button.style.font = "600 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    button.style.cursor = "pointer";

    button.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        return;
      }

      deferredInstallPrompt.prompt();

      const result = await deferredInstallPrompt.userChoice;

      console.log("[KAGE] install result:", result.outcome);

      deferredInstallPrompt = null;
      button.hidden = true;
    });

    document.body.appendChild(button);

    return button;
  }

  function setupInstallPrompt(button) {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();

      deferredInstallPrompt = event;

      button.hidden = false;

      console.log("[KAGE] install prompt available");
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      button.hidden = true;

      console.log("[KAGE] installed");
    });
  }

  function markInstalledState(button) {
    const standalone =
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches;

    const iosStandalone = window.navigator.standalone === true;

    if (standalone || iosStandalone) {
      button.hidden = true;
    }
  }

  function init() {
    addManifestLink();

    const button = createInstallButton();

    if (!button) {
      return;
    }

    setupInstallPrompt(button);
    markInstalledState(button);
    registerServiceWorker();

    console.log("[KAGE] install layer ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
