import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import sw from './locales/sw.json';
import fr from './locales/fr.json';

const LANGUAGE_STORAGE_KEY = 'ledgerly.language.v1';
const SUPPORTED_LANGUAGES = new Set(['en', 'sw', 'fr']);

const getBrowserLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  const candidate = String(window.navigator.language || 'en')
    .trim()
    .toLowerCase()
    .split('-')[0];
  return SUPPORTED_LANGUAGES.has(candidate) ? candidate : 'en';
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

export const resources = {
  en: { translation: en },
  sw: { translation: sw },
  fr: { translation: fr }
};

i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  },
  returnEmptyString: false
});

i18n.on('languageChanged', (language) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // no-op
  }
});

export const setAppLanguage = async (languageCode) => {
  const normalized = String(languageCode || '')
    .trim()
    .toLowerCase();
  if (!SUPPORTED_LANGUAGES.has(normalized)) {
    return false;
  }
  await i18n.changeLanguage(normalized);
  return true;
};

export default i18n;
