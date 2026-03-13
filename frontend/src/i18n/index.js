import { useSyncExternalStore } from 'react';

const LANGUAGE_STORAGE_KEY = 'invendex.language.v1';
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGE_CODES = Object.freeze(['en', 'sw', 'fr']);
const SUPPORTED_LANGUAGES = new Set(SUPPORTED_LANGUAGE_CODES);
const localeLoaders = Object.freeze({
  en: () => import('./locales/en.json'),
  sw: () => import('./locales/sw.json'),
  fr: () => import('./locales/fr.json')
});

const loadedBundles = new Map();
const listeners = new Set();

let currentLanguage = DEFAULT_LANGUAGE;
let initializationPromise = null;

const normalizeLanguageCode = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : DEFAULT_LANGUAGE;
};

const persistLanguage = (languageCode) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  } catch {
    // no-op
  }
};

const notifySubscribers = () => {
  listeners.forEach((listener) => listener());
};

const getBrowserLanguage = () => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const candidate = String(window.navigator.language || DEFAULT_LANGUAGE)
    .trim()
    .toLowerCase()
    .split('-')[0];
  return normalizeLanguageCode(candidate);
};

const getStoredLanguage = () => {
  if (typeof window === 'undefined') return '';
  return String(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || '')
    .trim()
    .toLowerCase();
};

const resolveInitialLanguage = () => {
  const stored = getStoredLanguage();
  if (SUPPORTED_LANGUAGES.has(stored)) {
    return stored;
  }
  return getBrowserLanguage();
};

const readNestedValue = (resource, key) =>
  String(key || '')
    .split('.')
    .reduce((value, segment) => {
      if (!segment || value == null || typeof value !== 'object') {
        return undefined;
      }
      return value[segment];
    }, resource);

const getLanguageSnapshot = () => currentLanguage;

const loadLocaleModule = async (languageCode) => {
  const normalized = normalizeLanguageCode(languageCode);
  const loader = localeLoaders[normalized];
  const module = await loader();
  return module?.default || module;
};

const ensureLanguageBundle = async (languageCode) => {
  const normalized = normalizeLanguageCode(languageCode);
  if (loadedBundles.has(normalized)) {
    return loadedBundles.get(normalized);
  }

  const translation = await loadLocaleModule(normalized);
  loadedBundles.set(normalized, translation);
  return translation;
};

const applyLanguage = (languageCode) => {
  const normalized = normalizeLanguageCode(languageCode);
  persistLanguage(normalized);

  if (currentLanguage === normalized) {
    return normalized;
  }

  currentLanguage = normalized;
  notifySubscribers();
  return normalized;
};

export const translate = (key) => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return '';

  const activeBundle = loadedBundles.get(currentLanguage);
  const fallbackBundle = loadedBundles.get(DEFAULT_LANGUAGE);
  const localizedValue = readNestedValue(activeBundle, normalizedKey);

  if (typeof localizedValue === 'string' && localizedValue.trim()) {
    return localizedValue;
  }

  const fallbackValue = readNestedValue(fallbackBundle, normalizedKey);
  if (typeof fallbackValue === 'string' && fallbackValue.trim()) {
    return fallbackValue;
  }

  return normalizedKey;
};

export const initializeI18n = async (
  languageCode = resolveInitialLanguage()
) => {
  const normalized = normalizeLanguageCode(languageCode);

  if (!initializationPromise) {
    initializationPromise = (async () => {
      await ensureLanguageBundle(DEFAULT_LANGUAGE);
      if (normalized !== DEFAULT_LANGUAGE) {
        await ensureLanguageBundle(normalized);
      }
      applyLanguage(normalized);
      return normalized;
    })();
  }

  await initializationPromise;

  if (normalized !== DEFAULT_LANGUAGE) {
    await ensureLanguageBundle(normalized);
  }

  applyLanguage(normalized);
  return {
    language: currentLanguage,
    changeLanguage: setAppLanguage,
    t: translate
  };
};

export const setAppLanguage = async (languageCode) => {
  const normalized = normalizeLanguageCode(languageCode);
  if (!SUPPORTED_LANGUAGES.has(normalized)) {
    return false;
  }

  await initializeI18n();
  await ensureLanguageBundle(normalized);
  applyLanguage(normalized);
  return true;
};

export const useTranslation = () => {
  const language = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getLanguageSnapshot,
    () => DEFAULT_LANGUAGE
  );

  return {
    i18n: {
      language,
      changeLanguage: setAppLanguage
    },
    language,
    t: translate
  };
};

export default {
  changeLanguage: setAppLanguage,
  get language() {
    return currentLanguage;
  },
  t: translate
};
