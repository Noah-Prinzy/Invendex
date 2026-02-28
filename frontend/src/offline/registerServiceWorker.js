const isProduction = () => process.env.NODE_ENV === 'production';

const isEnabled = () => {
  if (!isProduction()) return false;

  return (
    String(process.env.REACT_APP_OFFLINE_MODE || 'true')
      .trim()
      .toLowerCase() === 'true'
  );
};

const unregisterExistingServiceWorkers = () => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      })
      .catch(() => {
        // no-op: app continues without SW cleanup
      });
  });
};

export const registerLedgerlyServiceWorker = () => {
  if (!isEnabled()) {
    unregisterExistingServiceWorkers();
    return;
  }
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // no-op: app continues without SW
    });
  });
};

export default {
  registerLedgerlyServiceWorker
};
