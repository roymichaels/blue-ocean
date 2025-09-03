import { initI18n, t } from '@/services/i18n';

test('falls back to bundled translations when fetch fails', async () => {
  const originalFetch = global.fetch;
  // @ts-ignore
  global.fetch = jest.fn().mockRejectedValue(new Error('network'));
  await initI18n('en');
  expect(t('common.save')).toBe('Save');
  global.fetch = originalFetch;
});
