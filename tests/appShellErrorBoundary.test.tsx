import React from 'react';
import renderer from 'react-test-renderer';
import AppShell from '@/components/layout/AppShell';
const t = (s: string) => s;

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return { SafeAreaView: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@/components/GlobalHeader', () => () => null);

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', colors: { canvas: '', text: { primary: '', secondary: '' }, border: { primary: '' }, surface: { primary: '' } } }),
}));

const Thrower = () => {
  throw new Error('boom');
};

describe(t('AppShell error handling'), () => {
  it(t('shows fallback when child throws'), () => {
    const tree = renderer.create(
      <AppShell>
        <Thrower />
      </AppShell>
    ).toJSON();
    const str = JSON.stringify(tree);
    expect(str).toContain(t('Something went wrong'));
    expect(str).toContain(t('Retry'));
  });
});
