import { t, setTranslations } from '@/i18n';
import enTranslations from '@/translations/en.json';

describe('missing translation fallback', () => {
  afterEach(() => {
    // Restore English translations after each test to avoid side effects
    setTranslations(enTranslations);
  });

  it('warns and returns the key when a translation is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setTranslations({});
    const result = t('categories.electronics');
    expect(result).toBe('categories.electronics');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('categories.electronics'));
    warnSpy.mockRestore();
  });
});
