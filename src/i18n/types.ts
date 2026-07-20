export type AppLocale = 'en' | 'vi';

export const APP_LOCALES = [
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VI' },
] as const;

export const DEFAULT_APP_LOCALE: AppLocale = 'en';
export const APP_LOCALE_STORAGE_KEY = 'appaihelp.locale';
export const LANGUAGE_HEADER = 'Accept-Language';

export const isAppLocale = (value: unknown): value is AppLocale => {
  return value === 'en' || value === 'vi';
};

export const getStoredAppLocale = (): AppLocale => {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_LOCALE;
  }

  const storedLocale = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  return isAppLocale(storedLocale) ? storedLocale : DEFAULT_APP_LOCALE;
};

export const setStoredAppLocale = (locale: AppLocale) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
};
