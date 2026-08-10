const KAGE_INSTALL_EVENT = "kage-install-state";
let deferredInstallPrompt = null;
function emitInstallState() {
  window.dispatchEvent(
    new CustomEvent(KAGE_INSTALL_EVENT, {
      detail: getInstallState()
    })
  );
}
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator.standalone === true
  );
}
function isIOS() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}
function isAndroid() {
  return /Android/i.test(window.navigator.userAgent);
}
function isMacOS() {
  return /Macintosh|Mac OS X/i.test(window.navigator.userAgent);
}
function isWindows() {
  return /Windows/i.test(window.navigator.userAgent);
}
function isInstalled() {
  return isStandalone();
}
function getInstallState() {
  if (isInstalled()) {
    return {
      installed: true,
      canPrompt: false,
      platform: "installed",
      action: "installed"
    };
  }
  if (deferredInstallPrompt) {
    return {
      installed: false,
      canPrompt: true,
      platform: getPlatform(),
      action: "prompt"
    };
  }
  if (isIOS()) {
    return {
      installed: false,
      canPrompt: false,
      platform: "ios",
      action: "ios-instructions"
    };
  }
  if (isAndroid()) {
    return {
      installed: false,
      canPrompt: false,
      platform: "android",
      action: "browser-install"
    };
  }
  if (isMacOS()) {
    return {
      installed: false,
      canPrompt: false,
      platform: "macos",
      action: "browser-install"
    };
  }
  if (isWindows()) {
    return {
      installed: false,
      canPrompt: false,
      platform: "windows",
      action: "browser-install"
    };
  }
  return {
    installed: false,
    canPrompt: false,
    platform: "unknown",
    action: "browser-install"
  };
}
function getPlatform() {
  if (isIOS()) return "ios";
  if (isAndroid()) return "android";
  if (isMacOS()) return "macos";
  if (isWindows()) return "windows";
  return "unknown";
}
function getInstructions() {
  const platform = getPlatform();
  if (platform === "ios") {
    return {
      title: "Install KAGE",
      message:
        "Open KAGE in Safari, tap Share, then choose Add to Home Screen."
    };
  }
  if (platform === "android") {
    return {
      title: "Install KAGE",
      message:
        "Use your browser's Install app or Add to Home screen option."
    };
  }
  if (platform === "macos") {
    return {
      title: "Install KAGE",
      message:
        "Use your browser's Install KAGE or Add to Dock option when available."
    };
  }
  if (platform === "windows") {
    return {
      title: "Install KAGE",
      message:
        "Use your browser's Install KAGE or Apps → Install this site as an app option."
    };
  }
  return {
    title: "Install KAGE",
    message:
      "Use your browser's installation option to install KAGE as an app."
  };
}
async function installKAGE() {
  if (isInstalled()) {
    return {
      ok: true,
      installed: true,
      action: "already-installed"
    };
  }
  if (!deferredInstallPrompt) {
    return {
      ok: false,
      installed: false,
      action: getInstallState().action,
      instructions: getInstructions()
    };
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  try {
    const result = await promptEvent.prompt();
    const outcome = result?.outcome ?? "unknown";
    emitInstallState();
    return {
      ok: outcome === "accepted",
      installed: outcome === "accepted",
      action: "prompt-result",
      outcome
    };
  } catch (error) {
    emitInstallState();
    return {
      ok: false,
      installed: false,
      action: "prompt-error",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function setupKAGEInstall() {
  if (typeof window === "undefined") {
    return;
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    emitInstallState();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    emitInstallState();
  });
  emitInstallState();
}
export {
  KAGE_INSTALL_EVENT,
  getInstallState,
  getInstructions,
  installKAGE,
  isInstalled,
  setupKAGEInstall
};
