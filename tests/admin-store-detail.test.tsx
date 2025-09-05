import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StoreDetail from '@app/admin/stores/[storeId]/index';

jest.mock('expo-router', () => {
  const router = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
  return {
    useLocalSearchParams: jest.fn(),
    useRouter: () => router,
    router,
  };
});

jest.mock('@/services/navigation', () => {
  const actual = jest.requireActual('@/services/navigation');
  return {
    ...actual,
    push: jest.fn(actual.push),
    replace: jest.fn(actual.replace),
  };
});

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: { primary: '#000', secondary: '#111', inverse: '#fff' },
      interactive: { primary: '#00f' },
    },
  }),
}));

jest.mock('@/features/stores/services/nearStores', () => ({ getStore: jest.fn() }));

jest.mock('@/features/auth/AuthContext', () => ({ useAuth: jest.fn() }));

describe('Admin store detail access control', () => {
  const { useLocalSearchParams } = require('expo-router');
  const navigation = require('@/services/navigation');
  const { getStore } = require('@/features/stores/services/nearStores');
  const { useAuth } = require('@/features/auth/AuthContext');
  const TAB_GROUP = '(' + 'tabs' + ')';

  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ storeId: 's1' });
    navigation.replace.mockClear();
    navigation.push.mockClear();
    getStore.mockReset();
    useAuth.mockReset();
  });

  it('redirects non-admin user', async () => {
    useAuth.mockReturnValue({ user: { address: 'owner1', role: 'store-owner' } });
    getStore.mockResolvedValue({ id: 's1', name: 'Store', owner: 'owner1' });

    await act(async () => {
      renderer.create(React.createElement(StoreDetail));
    });
    await act(async () => {});
    expect(navigation.replace).toHaveBeenCalledWith('/');
    expect(navigation.replace.mock.calls[0][0]).not.toContain(TAB_GROUP);
  });

  it('allows platform admin', async () => {
    useAuth.mockReturnValue({ user: { address: 'admin', role: 'platform-admin' } });
    getStore.mockResolvedValue({ id: 's1', name: 'Store', owner: 'owner1' });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(React.createElement(StoreDetail));
    });
    await act(async () => {});
    expect(navigation.replace).not.toHaveBeenCalled();
    const str = JSON.stringify(root!.toJSON());
    expect(str).toContain('Impersonate');
  });
});
