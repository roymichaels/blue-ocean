import React from 'react';
import renderer from 'react-test-renderer';
import App from '@/App';
const t = (s: string) => s;

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return { GestureHandlerRootView: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return { SafeAreaProvider: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

jest.mock('expo-router', () => ({
  Router: () => {
    throw new Promise(() => {});
  },
  usePathname: () => '/',
  useSegments: () => [],
}));

jest.mock('@/services/navigation', () => ({ stripTabsPrefix: (s: string) => s }));
jest.mock('@/ui/ThemeProvider', () => ({ useLanguage: () => ({ t: (s: string) => s }) }));
jest.mock('@/utils/logger', () => ({ debugLog: jest.fn() }));
jest.mock('@/ui/primitives', () => ({ Spinner: () => 'spinner' }));

describe(t('App cold start'), () => {
  it(t('renders spinner while loading'), () => {
    const tree = renderer.create(<App />).toJSON();
    expect(JSON.stringify(tree)).toContain('spinner');
  });
});
