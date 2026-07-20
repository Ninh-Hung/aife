import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';
import { DEFAULT_APP_LOCALE, getStoredAppLocale, setStoredAppLocale } from './types';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: getStoredAppLocale(),
  fallbackLng: DEFAULT_APP_LOCALE,
  supportedLngs: ['en', 'vi'],
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (locale) => {
  if (locale === 'en' || locale === 'vi') {
    setStoredAppLocale(locale);
  }
});

export default i18n;
