import React from 'react';
import renderer from 'react-test-renderer';
import TopBar from '@/components/TopBar';
import { Pressable } from 'react-native';

const mockPush = jest.fn();
const mockUsePathname = jest.fn();

jest.mock('@/services', () => ({
  useAppRouter: () => ({ push: mockPush })
}));

jest.mock('expo-router', () => ({
  usePathname: () => mockUsePathname()
}));

jest.mock('@/contexts/AppInfoContext', () => ({
  useAppInfo: () => ({ appName: 'Blue', logoCid: null })
}));

jest.mock('@/components/SmartImage', () => () => null);

jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => ({ t: (s: string) => s, isRTL: false, currentLanguage: 'en', setLanguage: jest.fn() }),
  useTheme: () => ({ colors: { background: '#fff', surface: { primary: '#fff' }, text: { primary: '#000', inverse: '#fff' }, gold: '#FFD700', border: { primary: '#000', focus: '#000' } } })
}));

jest.mock('@/components/NotificationContext', () => ({
  useNotificationState: () => ({ unreadCount: 0, refreshNotifications: jest.fn() }),
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
    mockPush.mockClear();
  });

  it('does not push to current path', () => {
    mockUsePathname.mockReturnValue('/');
    const tree = renderer.create(React.createElement(TopBar));
    const pressables = tree.root.findAllByType(Pressable);
    pressables[0].props.onPress();
    expect(mockPush).not.toHaveBeenCalled();
  });

});

