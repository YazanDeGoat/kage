/*
 * KAGE INSTALL CONTROLLER
 *
 * Handles:
 * - Chromium PWA installation
 * - iPhone/iPad installation guidance
 * - Desktop installation guidance
 * - Already-installed detection
 * - KAGE download/install button integration
 */
let deferredInstallPrompt = null;
const KAGE_INSTALL_EVENT = "kage-install-state-change";
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isChromium() {
  return /Chrome|Chromium|Edg|OPR|Brave/i.test(navigator.userAgent);
}
function getInstallState() {
  if (isStandalone()) {
    return {
      state: "installed",
      platform: isIOS() ? "ios" : "installed"
    };
  }
  if (deferredInstallPrompt) {
    return {
      state: "ready",
      platform: "chromium"
    };
  }
  if (isIOS()) {
    return {
      state: "ios",
      platform: "ios"
    };
  }
  if (isChromium()) {
    return {
      state: "browser",
      platform: "chromium"
    };
  }
  return {
    state: "browser",
    platform: "browser"
  };
}
function notifyInstallState() {
  window.dispatchEvent(
    new CustomEvent(KAGE_INSTALL_EVENT, {
      detail: getInstallState()
    })
  );
}
function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  notifyInstallState();
}
async function installKAGE() {
  if (isStandalone()) {
    return {
      success: true,
      state: "installed"
    };
  }
  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    try {
      const result = await promptEvent.prompt();
      const outcome = result?.outcome || "unknown";
      notifyInstallState();
      return {
        success: outcome === "accepted",
        state: outcome === "accepted"
          ? "installed"
          : "dismissed",
        outcome
      };
    } catch (error) {
      deferredInstallPrompt = promptEvent;
      console.error("KAGE install prompt failed:", error);
      notifyInstallState();
      return {
        success: false,
        state: "error",
        error
      };
    }
  }
  if (isIOS()) {
    showIOSInstallInstructions();
    return {
      success: false,
      state: "ios-instructions"
    };
  }
  showDesktopInstallInstructions();
  return {
    success: false,
    state: "instructions"
  };
}
function showIOSInstallInstructions() {
  const existing = document.getElementById("kageInstallInstructions");
  if (existing) {
    existing.remove();
  }
  const modal = document.createElement("div");
  modal.id = "kageInstallInstructions";
  modal.innerHTML = `
    <div class="kage-install-overlay">
      <div class="kage-install-modal">
        <button
          class="kage-install-close"
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        <div class="kage-install-icon">↓</div>
        <h2>Install KAGE</h2>
        <p>
          Add KAGE to your Home Screen so it opens like an app.
        </p>
        <div class="kage-install-steps">
          <div>
            <strong>1.</strong>
            Tap the <strong>Share</strong> button in your browser.
          </div>
          <div>
            <strong>2.</strong>
            Choose <strong>Add to Home Screen</strong>.
          </div>
          <div>
            <strong>3.</strong>
            Tap <strong>Add</strong>.
          </div>
        </div>
        <p class="kage-install-note">
          After installation, open KAGE from your Home Screen.
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal
    .querySelector(".kage-install-close")
    .addEventListener("click", () => {
      modal.remove();
    });
  modal
    .querySelector(".kage-install-overlay")
    .addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        modal.remove();
      }
    });
}
function showDesktopInstallInstructions() {
  const existing = document.getElementById("kageInstallInstructions");
  if (existing) {
    existing.remove();
  }
  const modal = document.createElement("div");
  modal.id = "kageInstallInstructions";
  modal.innerHTML = `
    <div class="kage-install-overlay">
      <div class="kage-install-modal">
        <button
          class="kage-install-close"
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        <div class="kage-install-icon">↓</div>
        <h2>Install KAGE</h2>
        <p>
          Your browser does not currently expose KAGE's direct install prompt.
        </p>
        <div class="kage-install-steps">
          <div>
            Open your browser's <strong>menu</strong>.
          </div>
          <div>
            Look for <strong>Install KAGE</strong>,
            <strong>Install app</strong>, or
            <strong>Add to Home Screen</strong>.
          </div>
          <div>
            Confirm the installation.
          </div>
        </div>
        <p class="kage-install-note">
          If your browser supports PWA installation, its native install
          option will appear there.
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal
    .querySelector(".kage-install-close")
    .addEventListener("click", () => {
      modal.remove();
    });
  modal
    .querySelector(".kage-install-overlay")
    .addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        modal.remove();
      }
    });
}
function bindKAGEInstallButton(button) {
  if (!button || button.dataset.kageInstallBound === "true") {
    return;
  }
  button.dataset.kageInstallBound = "true";
  button.addEventListener("click", async () => {
    await installKAGE();
  });
  updateInstallButton(button);
}
function updateInstallButton(button) {
  if (!button) {
    return;
  }
  const state = getInstallState();
  button.dataset.installState = state.state;
  if (state.state === "installed") {
    button.title = "KAGE is installed";
    button.setAttribute("aria-label", "KAGE is installed");
    button.disabled = false;
    return;
  }
  if (state.state === "ready") {
    button.title = "Install KAGE";
    button.setAttribute("aria-label", "Install KAGE");
    button.disabled = false;
    return;
  }
  if (state.state === "ios") {
    button.title = "Add KAGE to Home Screen";
    button.setAttribute(
      "aria-label",
      "Add KAGE to Home Screen"
    );
    button.disabled = false;
    return;
  }
  button.title = "Install KAGE";
  button.setAttribute("aria-label", "Install KAGE");
  button.disabled = false;
}
function refreshInstallButtons() {
  const selectors = [
    "#downloadKage",
    "#downloadButton",
    ".downloadKage",
    ".download-button",
    "[data-kage-install]"
  ];
  const buttons = document.querySelectorAll(
    selectors.join(",")
  );
  buttons.forEach((button) => {
    bindKAGEInstallButton(button);
    updateInstallButton(button);
  });
}
window.addEventListener(
  "beforeinstallprompt",
  handleBeforeInstallPrompt
);
window.addEventListener(
  "appinstalled",
  () => {
    deferredInstallPrompt = null;
    notifyInstallState();
    refreshInstallButtons();
  }
);
window.addEventListener(
  "pageshow",
  () => {
    refreshInstallButtons();
    notifyInstallState();
  }
);
window.addEventListener(
  KAGE_INSTALL_EVENT,
  () => {
    refreshInstallButtons();
  }
);
window.KAGEInstall = {
  install: installKAGE,
  getState: getInstallState,
  refresh: refreshInstallButtons,
  bind: bindKAGEInstallButton
};
document.addEventListener(
  "DOMContentLoaded",
  () => {
    refreshInstallButtons();
    notifyInstallState();
  }
);
