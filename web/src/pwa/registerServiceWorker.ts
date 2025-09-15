const SW_PATH = '/service-worker.js';

const shouldRegister = () =>
  process.env.NODE_ENV === 'production' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

const handleUpdate = (registration: ServiceWorkerRegistration) => {
  if (!registration.waiting) {
    return;
  }
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
};

export function registerServiceWorker(): void {
  if (!shouldRegister()) {
    return;
  }

  const register = () => {
    navigator.serviceWorker
      .register(SW_PATH)
      .then((registration) => {
        if (registration.waiting) {
          handleUpdate(registration);
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }
          installing.addEventListener('statechange', () => {
            if (registration.waiting && installing.state === 'installed') {
              handleUpdate(registration);
            }
          });
        });
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Service worker registration failed', error);
        }
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}
