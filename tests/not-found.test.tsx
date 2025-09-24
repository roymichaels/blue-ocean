import React from 'react';
import renderer, { act } from 'react-test-renderer';
import NotFoundScreen from '@/app/+not-found';

jest.mock('expo-router', () => {
  const router = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
  return {
    router,
    Stack: { Screen: () => null },
    useRouter: () => router,
    Redirect: ({ href }: any) => {
      const { replace } = require('@/hooks/navigation');
      replace(href);
      return null;
    },
  };
});

jest.mock('@/hooks/navigation', () => {
  const actual = jest.requireActual('@/hooks/navigation');
  return {
    ...actual,
    push: jest.fn(actual.push),
    replace: jest.fn(actual.replace),
  };
});

describe('NotFoundScreen', () => {
  const navigation = require('@/hooks/navigation');
  const { TouchableOpacity } = require('react-native');
  const originalDev = (globalThis as any).__DEV__;
  const TAB_GROUP = '(' + 'tabs' + ')';

  beforeEach(() => {
    navigation.replace.mockClear();
  });

  afterEach(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it('redirects home in dev', () => {
    (globalThis as any).__DEV__ = true;
    act(() => {
      renderer.create(React.createElement(NotFoundScreen));
    });
    expect(navigation.replace).toHaveBeenCalledWith('/');
    expect(navigation.replace.mock.calls[0][0]).not.toContain(TAB_GROUP);
  });

  it('renders Go Home button in production', () => {
    (globalThis as any).__DEV__ = false;
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(React.createElement(NotFoundScreen));
    });
    const button = tree!.root.findByType(TouchableOpacity);
    expect(navigation.replace).not.toHaveBeenCalled();
    act(() => {
      button.props.onPress();
    });
    expect(navigation.replace).toHaveBeenCalledWith('/');
    expect(navigation.replace.mock.calls[0][0]).not.toContain(TAB_GROUP);
  });
});
