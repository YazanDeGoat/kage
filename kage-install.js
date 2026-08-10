/*
 * KAGE Install Controller
 *
 * Handles:
 * - Chromium beforeinstallprompt
 * - appinstalled
 * - standalone detection
 * - iPhone/iPad Safari instructions
 * - desktop install instructions
 *
 * Exposes:
 *   window.KAGEInstall
 */
const KAGEInstall = (() => {
  let deferredPrompt = null;
  const isStandalone = () => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  };
  const isIOS = () => {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (
        navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1
      )
    );
  };
  const isChromiumInstallCapable = () => {
    return !!deferredPrompt;
  };
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    window.dispatchEvent(
      new CustomEvent("kage-install-ready")
    );
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(
      new CustomEvent("kage-installed")
    );
  });
  async function install() {
    if (isStandalone()) {
      return {
        status: "installed"
      };
    }
    if (deferredPrompt) {
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      await promptEvent.prompt();
      const result = await promptEvent.userChoice;
      if (result.outcome === "accepted") {
        return {
          status: "installed"
        };
      }
      return {
        status: "dismissed"
      };
    }
    if (isIOS()) {
      return {
        status: "ios"
      };
    }
    return {
      status: "instructions"
    };
  }
  function getStatus() {
    if (isStandalone()) {
      return "installed";
    }
    if (deferredPrompt) {
      return "ready";
    }
    if (isIOS()) {
      return "ios";
    }
    return "instructions";
  }
  function showInstructions() {
    const status = getStatus();
    if (status === "installed") {
      alert("KAGE is already installed on this device.");
      return;
    }
    if (status === "ios") {
      alert(
        "Install KAGE on iPhone/iPad:\n\n" +
        "1. Open KAGE in Safari.\n" +
        "2. Tap the Share button.\n" +
        "3. Tap “Add to Home Screen”.\n" +
        "4. Tap “Add”.\n\n" +
        "KAGE will then open like an installed app."
      );
      return;
    }
    alert(
      "Install KAGE:\n\n" +
      "Use your browser's Install App / Add to Home Screen option."
    );
  }
  async function trigger() {
    const result = await install();
    if (
      result.status === "ios" ||
      result.status === "instructions"
    ) {
      showInstructions();
    }
    return result;
  }
  return {
    install,
    trigger,
    getStatus,
    isStandalone,
    isIOS,
    isChromiumInstallCapable
  };
})();
window.KAGEInstall = KAGEInstall;
