(function () {
  "use strict";

  const SERVICE_WORKER_PATH = "/sw.js";

  function dispatch(name, detail) {
    window.dispatchEvent(
      new CustomEvent(name, {
        detail: detail || {}
      })
    );
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      dispatch("kage:offline-unavailable", {
        reason: "service-worker-not-supported"
      });

      return null;
    }

    try {
      const registration =
        await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
          scope: "/"
        });

      dispatch("kage:offline-ready", {
        registration
      });

      return registration;
    } catch (error) {
      console.error("KAGE offline registration failed:", error);

      dispatch("kage:offline-error", {
        error
      });

      return null;
    }
  }

  async function waitForServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return null;
    }

    if (navigator.serviceWorker.controller) {
      return navigator.serviceWorker.controller;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 10000);

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          clearTimeout(timeout);
          resolve(navigator.serviceWorker.controller);
        },
        { once: true }
      );
    });
  }

  function getConnectionState() {
    return navigator.onLine ? "online" : "offline";
  }

  function emitConnectionState() {
    const state = getConnectionState();

    dispatch("kage:connection-status", {
      state,
      online: state === "online",
      offline: state === "offline"
    });
  }

  window.KAGEOffline = {
    register: registerServiceWorker,

    async initialize() {
      emitConnectionState();

      const registration = await registerServiceWorker();

      await waitForServiceWorker();

      return {
        registration,
        state: getConnectionState(),
        online: navigator.onLine
      };
    },

    getStatus() {
      return getConnectionState();
    },

    isOnline() {
      return navigator.onLine;
    },

    isOffline() {
      return !navigator.onLine;
    },

    onConnectionChange(callback) {
      if (typeof callback !== "function") {
        return function () {};
      }

      const handler = (event) => {
        callback(event.detail);
      };

      window.addEventListener("kage:connection-status", handler);

      return function () {
        window.removeEventListener(
          "kage:connection-status",
          handler
        );
      };
    },

    onReady(callback) {
      if (typeof callback !== "function") {
        return function () {};
      }

      const handler = (event) => {
        callback(event.detail);
      };

      window.addEventListener("kage:offline-ready", handler);

      return function () {
        window.removeEventListener(
          "kage:offline-ready",
          handler
        );
      };
    }
  };

  window.addEventListener("online", emitConnectionState);
  window.addEventListener("offline", emitConnectionState);

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        window.KAGEOffline.initialize();
      },
      { once: true }
    );
  } else {
    window.KAGEOffline.initialize();
  }
})();
