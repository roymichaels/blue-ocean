import enTranslations from '@/translations/en.json';

export let t = (
  key: string,
  options?: Record<string, string | number> | string,
): string => {
  const keys = key.split('.');
  let value: any = enTranslations;
  for (const k of keys) {
    value = value?.[k];
  }
  if (typeof value === 'string') {
    if (options && typeof options === 'object') {
      return value.replace(/\{(.*?)\}/g, (_, p) => String((options as any)[p] ?? ''));
    }
    return value;
  }
  return typeof options === 'string' ? options : key;
};

export const setT = (
  fn: (key: string, options?: Record<string, string | number> | string) => string,
) => {
  t = fn;
};
