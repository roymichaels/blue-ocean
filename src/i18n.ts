import enTranslations from '@/translations/en.json';

// Current translation table. Defaults to English.
let translations: Record<string, any> = enTranslations;

/**
 * Override the active translation dictionary.
 */
export const setTranslations = (dict: Record<string, any>) => {
  translations = dict;
};

/**
 * Translate a key using the active translation dictionary. If the key is not
 * found, a console warning is emitted and the key itself is returned so
 * developers can easily spot missing translations.
 */
export let t = (
  key: string,
  options?: Record<string, string | number> | string,
): string => {
  const keys = key.split('.');
  let value: any = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  if (typeof value === 'string') {
    if (options && typeof options === 'object') {
      return value.replace(/\{(.*?)\}/g, (_, p) => String((options as any)[p] ?? ''));
    }
    return value;
  }
  console.warn(`Missing translation for key: ${key}`);
  return typeof options === 'string' ? options : key;
};

export const setT = (
  fn: (key: string, options?: Record<string, string | number> | string) => string,
) => {
  t = fn;
};
