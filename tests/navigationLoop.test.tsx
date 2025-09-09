import React from 'react';
import renderer from 'react-test-renderer';
import GlobalHeader from '@/components/GlobalHeader';
import { Pressable } from 'react-native';

const pushMock = jest.fn();
const usePathnameMock = jest.fn();

jest.mock('@/services', () => ({
  useAppRouter: () => ({ push: pushMock })
}));

jest.mock('expo-router', () => ({
  usePathname: () => usePathnameMock()
}));

jest.mock('@/contexts/AppInfoContext', () => ({
  useAppInfo: () => ({ appName: 'Blue', logoCid: null })
}));

jest.mock('@/contexts/RoadmapContext', () => ({
  useRoadmap: () => ({ progress: 0 })
}));

jest.mock('@/features/cart', () => ({
  WishlistModal: () => null,
  useWishlistCount: () => 0
}));

jest.mock('@/components/SmartImage', () => () => null);

jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => ({ t: (s: string) => s }),
  useTheme: () => ({ colors: { background: '#fff', surface: { primary: '#fff' }, text: { primary: '#000', inverse: '#fff' }, gold: '#FFD700', border: { primary: '#000' } } })
}));

jest.mock('@/ui', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Text,
    Button: ({ onPress, children }: any) => React.createElement(Pressable, { onPress }, children),
  };
});

describe('navigation loop prevention', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('does not push to current path', () => {
    usePathnameMock.mockReturnValue('/');
    const tree = renderer.create(React.createElement(GlobalHeader));
    const pressables = tree.root.findAllByType(Pressable);
    pressables[0].props.onPress();
    expect(pushMock).not.toHaveBeenCalled();
  });

});

