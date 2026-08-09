(function () {
  "use strict";

  const STATUS_EVENT = "kage:connection-status";

  function getStatus() {
    return navigator.onLine ? "online" : "offline";
  }

  function emitStatus() {
    const status = getStatus();

    window.dispatchEvent(
      new CustomEvent(STATUS_EVENT, {
        detail: {
          status,
          online: status === "online"
        }
      })
    );
  }

  window.KAGEOffline = {
    getStatus,
    isOnline() {
      return navigator.onLine;
    },
    isOffline() {
      return !navigator.onLine;
    },
    onStatusChange(callback) {
      if (typeof callback !== "function") {
        return () => {};
      }

      const handler = (event) => {
        callback(event.detail);
      };

      window.addEventListener(STATUS_EVENT, handler);

      return () => {
        window.removeEventListener(STATUS_EVENT, handler);
      };
    }
  };

  window.addEventListener("online", emitStatus);
  window.addEventListener("offline", emitStatus);

  emitStatus();
})();
