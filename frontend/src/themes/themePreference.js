import { DEFAULT_THEME_ID, getThemeById } from './themeCatalog.js';

const THEME_STORAGE_KEY = 'ledgerly.theme.id';

const normalizeThemeId = (themeId) =>
  getThemeById(themeId)?.id || DEFAULT_THEME_ID;

const canUseWindow = () => typeof window !== 'undefined';
const canUseDocument = () => typeof document !== 'undefined';

export const readThemePreference = () => {
  if (!canUseWindow()) return DEFAULT_THEME_ID;

  try {
    const storedThemeId = window.localStorage.getItem(THEME_STORAGE_KEY);
    return normalizeThemeId(storedThemeId);
  } catch {
    return DEFAULT_THEME_ID;
  }
};

export const writeThemePreference = (themeId) => {
  if (!canUseWindow()) return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizeThemeId(themeId));
  } catch {
    // No-op when storage is unavailable.
  }
};

export const applyThemePreference = (themeId) => {
  if (!canUseDocument()) return;
  document.documentElement.setAttribute(
    'data-theme',
    normalizeThemeId(themeId)
  );
};

export default {
  readThemePreference,
  writeThemePreference,
  applyThemePreference
};
