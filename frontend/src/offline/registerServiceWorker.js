const isEnabled = () =>
  String(process.env.REACT_APP_OFFLINE_MODE || 'true')
    .trim()
    .toLowerCase() === 'true';

export const registerLedgerlyServiceWorker = () => {
  if (!isEnabled()) return;
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
