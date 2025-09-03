import React from 'react';
import renderer, { act } from 'react-test-renderer';
import NotFoundScreen from '@app/+not-found';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  Stack: { Screen: () => null },
}));

describe('NotFoundScreen', () => {
  const { router } = require('expo-router');
  const { TouchableOpacity } = require('react-native');
  const originalDev = (globalThis as any).__DEV__;

  beforeEach(() => {
    router.replace.mockReset();
  });

  afterEach(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it('redirects home in dev', () => {
    (globalThis as any).__DEV__ = true;
    act(() => {
      renderer.create(<NotFoundScreen />);
    });
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('renders Go Home button in production', () => {
    (globalThis as any).__DEV__ = false;
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<NotFoundScreen />);
    });
    const button = tree!.root.findByType(TouchableOpacity);
    expect(router.replace).not.toHaveBeenCalled();
    act(() => {
      button.props.onPress();
    });
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
