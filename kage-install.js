"use strict";

(() => {
  let deferredPrompt = null;

  function isIOS() {
    return (
      /iPad|iPhone|iPod/i.test(
        navigator.userAgent
      ) ||
      (
        navigator.platform ===
          "MacIntel" &&
        navigator.maxTouchPoints > 1
      )
    );
  }

  function isStandalone() {
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

      deferredPrompt = event;

      window.dispatchEvent(
        new CustomEvent(
          "kage-install-available"
        )
      );
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {
      deferredPrompt = null;

      window.dispatchEvent(
        new CustomEvent(
          "kage-install-complete"
        )
      );
    }
  );

  async function install() {
    if (isStandalone()) {
      return {
        status: "installed"
      };
    }

    if (deferredPrompt) {
      const prompt =
        deferredPrompt;

      deferredPrompt = null;

      try {
        await prompt.prompt();

        const result =
          await prompt.userChoice;

        return {
          status:
            result.outcome ===
            "accepted"
              ? "installed"
              : "dismissed"
        };
      } catch (error) {
        console.warn(
          "KAGE install failed:",
          error
        );

        return {
          status: "error",
          error
        };
      }
    }

    if (isIOS()) {
      return {
        status: "ios-instructions"
      };
    }

    return {
      status: "browser-instructions"
    };
  }

  function canInstall() {
    return Boolean(
      deferredPrompt
    );
  }

  function isInstalled() {
    return isStandalone();
  }

  window.KAGEInstall = {
    install,
    open: install,
    prompt: install,
    canInstall,
    isInstalled
  };
})();
