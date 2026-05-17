import { safeGetItem, safeSetItem } from './safeStorage';

type PwaUpdateInfo = {
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
};

const UPDATE_CHECK_KEY = 'pwa_update_checked';

let updateListeners: Array<(hasUpdate: boolean) => void> = [];

export function onPwaUpdateAvailable(callback: (hasUpdate: boolean) => void): () => void {
  updateListeners.push(callback);
  return () => {
    updateListeners = updateListeners.filter((l) => l !== callback);
  };
}

function notifyListeners(hasUpdate: boolean): void {
  for (const listener of updateListeners) {
    try { listener(hasUpdate); } catch { /* ignore */ }
  }
}

export function checkForPwaUpdate(): Promise<PwaUpdateInfo> {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve({ hasUpdate: false, registration: null });
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.update().then(() => {
        if (registration.waiting) {
          safeSetItem(UPDATE_CHECK_KEY, Date.now());
          notifyListeners(true);
          resolve({ hasUpdate: true, registration });
        } else {
          resolve({ hasUpdate: false, registration });
        }
      });
    });
  });
}

export function applyPwaUpdate(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function listenForSwUpdates(): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  const handler = () => {
    checkForPwaUpdate();
  };

  window.addEventListener('sw-update-available', handler as EventListener);

  const intervalId = setInterval(checkForPwaUpdate, 3600000);

  return () => {
    window.removeEventListener('sw-update-available', handler as EventListener);
    clearInterval(intervalId);
  };
}
