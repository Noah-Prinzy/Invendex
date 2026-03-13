export const AUTH_INTRO_COMPLETED_STORAGE_KEY =
  'invendex:auth_intro_completed:v1';
const LEGACY_AUTH_INTRO_COMPLETED_STORAGE_KEYS = Object.freeze([
  'Invendex:auth_intro_completed:v1'
]);

export const hasCompletedAuthIntro = () => {
  if (typeof window === 'undefined') return false;

  try {
    return (
      window.localStorage.getItem(AUTH_INTRO_COMPLETED_STORAGE_KEY) === '1' ||
      LEGACY_AUTH_INTRO_COMPLETED_STORAGE_KEYS.some(
        (storageKey) => window.localStorage.getItem(storageKey) === '1'
      )
    );
  } catch {
    return false;
  }
};

export const markAuthIntroCompleted = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(AUTH_INTRO_COMPLETED_STORAGE_KEY, '1');
    LEGACY_AUTH_INTRO_COMPLETED_STORAGE_KEYS.forEach((storageKey) => {
      window.localStorage.removeItem(storageKey);
    });
  } catch {
    // Ignore storage errors and fall back to in-memory UI behavior.
  }
};
