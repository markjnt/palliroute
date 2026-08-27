import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@palliroute/auth";
import { registerSW } from "virtual:pwa-register";
import { queryClient } from "./query/client";

if ("serviceWorker" in navigator) {
  let updateToast: HTMLDivElement | null = null;
  let isReloading = false;

  const showUpdateToast = () => {
    if (updateToast) {
      return;
    }

    updateToast = document.createElement("div");
    updateToast.textContent = "Neue Version verfügbar. Aktualisierung läuft …";
    updateToast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 9999px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 9999;
    `;

    document.body.appendChild(updateToast);
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isReloading) {
      return;
    }
    isReloading = true;

    if (updateToast) {
      updateToast.style.transition = "opacity 200ms ease";
      updateToast.style.opacity = "0";
    }

    setTimeout(() => {
      if (updateToast?.parentElement) {
        updateToast.parentElement.removeChild(updateToast);
      }
      window.location.reload();
    }, 200);
  });

  const triggerUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdateToast();
      triggerUpdate(true);
    },
    onOfflineReady() {
      console.log("App ist jetzt offlinefähig!");
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        void registration.update();
      };

      checkForUpdate();
      setInterval(checkForUpdate, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          checkForUpdate();
        }
      });
    },
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
