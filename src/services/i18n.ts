import en from '../../translations/en.json';

const translations: Record<string, any> = { en };
let currentLanguage = 'en';
const missing: Record<string, boolean> = {};

export async function initI18n(lang: string = 'en') {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    if (res.ok) {
      translations[lang] = await res.json();
    }
  } catch {
    // ignore fetch failures, fall back to bundled translations
  }
  currentLanguage = lang;
}

export function t(key: string, params?: Record<string, string | number>) {
  const keys = key.split('.');
  let value: any = translations[currentLanguage];
  for (const k of keys) {
    value = value?.[k];
  }
  if (typeof value === 'string') {
    if (params) {
      return value.replace(/\{(.*?)\}/g, (_, p) => String(params[p] ?? ''));
    }
    return value;
  }
  if (process.env.NODE_ENV !== 'production' && !missing[key]) {
    console.warn(`Missing i18n key: ${key}`);
    missing[key] = true;
  }
  const fallback = keys[keys.length - 1]
    .replace(/[-_]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase();
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

