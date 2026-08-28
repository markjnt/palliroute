import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@palliroute/auth';
import { registerSW } from 'virtual:pwa-register';
import { queryClient } from './query/client';

if ('serviceWorker' in navigator) {
  let updateToast: HTMLDivElement | null = null;
  let isReloading = false;
  let applyUpdate: (() => void) | null = null;

  const showUpdateToast = (onUpdate: () => void) => {
    if (updateToast) {
      return;
    }

    updateToast = document.createElement('div');
    updateToast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 16px;
      background: #1f2937;
      color: #ffffff;
      padding: 12px 16px 12px 20px;
      border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 9999;
    `;

    const message = document.createElement('span');
    message.textContent = 'Neue Version verfügbar';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Jetzt aktualisieren';
    button.style.cssText = `
      background: #007AFF;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    `;
    button.addEventListener('click', () => {
      button.disabled = true;
      button.textContent = 'Aktualisiere …';
      message.textContent = 'Update wird geladen';
      onUpdate();
    });

    updateToast.append(message, button);
    document.body.appendChild(updateToast);
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloading) {
      return;
    }
    isReloading = true;

    if (updateToast) {
      updateToast.style.transition = 'opacity 200ms ease';
      updateToast.style.opacity = '0';
    }

    setTimeout(() => {
      if (updateToast?.parentElement) {
        updateToast.parentElement.removeChild(updateToast);
      }
      window.location.reload();
    }, 200);
  });

  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdateToast(() => applyUpdate?.(true));
    },
    onOfflineReady() {
      console.log('App ist jetzt offlinefähig!');
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        void registration.update();
      };

      checkForUpdate();
      setInterval(checkForUpdate, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate();
        }
      });
    },
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
