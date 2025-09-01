import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StoreDetail from '../app/admin/stores/[storeId]/index';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: { primary: '#000', secondary: '#111', inverse: '#fff' },
      interactive: { primary: '#00f' },
    },
  }),
}));

jest.mock('@/features/stores/services/tonStores', () => ({ getStore: jest.fn() }));

jest.mock('@/features/auth/AuthContext', () => ({ useAuth: jest.fn() }));

describe('Admin store detail access control', () => {
  const { useLocalSearchParams, router } = require('expo-router');
  const { getStore } = require('@/features/stores/services/tonStores');
  const { useAuth } = require('@/features/auth/AuthContext');

  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ storeId: 's1' });
    router.replace.mockReset();
    router.push.mockReset();
    getStore.mockReset();
    useAuth.mockReset();
  });

  it('redirects non-admin user', async () => {
    useAuth.mockReturnValue({ user: { address: 'owner1', role: 'store-owner' } });
    getStore.mockResolvedValue({ id: 's1', name: 'Store', owner: 'owner1' });

    await act(async () => {
      renderer.create(<StoreDetail />);
    });
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('allows platform admin', async () => {
    useAuth.mockReturnValue({ user: { address: 'admin', role: 'platform-admin' } });
    getStore.mockResolvedValue({ id: 's1', name: 'Store', owner: 'owner1' });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreDetail />);
    });
    await act(async () => {});
    expect(router.replace).not.toHaveBeenCalled();
    const str = JSON.stringify(root!.toJSON());
    expect(str).toContain('Impersonate');
  });
});
