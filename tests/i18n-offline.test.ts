import { t } from '@/i18n';

test(t('tests.offlineUsesBundledTranslations', 'uses bundled translations when offline'), () => {
  expect(t('common.save')).toBe('Save');
});
