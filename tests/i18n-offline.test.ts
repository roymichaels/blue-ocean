import React from 'react';
import renderer from 'react-test-renderer';
import { Text } from 'react-native';
import { initI18n, t } from '@/services/i18n';

function SaveButton() {
  return React.createElement(Text, null, t('common.save'));
}

test('falls back to bundled translations when fetch fails', async () => {
  const originalFetch = global.fetch;
  // @ts-ignore
  global.fetch = jest.fn().mockRejectedValue(new Error('network'));

  await initI18n('en');
  const root = renderer.create(React.createElement(SaveButton));
  expect(root.root.findByType(Text).props.children).toBe('Save');

  global.fetch = originalFetch;
});
