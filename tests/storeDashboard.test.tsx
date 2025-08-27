import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StoreDashboardScreen from '../app/store/[storeId]/admin/dashboard';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: { primary: '#000' },
      border: { primary: '#000' },
    },
  }),
}));

jest.mock('../services/tonStores', () => ({ getStore: jest.fn() }));
jest.mock('../services/tonProducts', () => ({ listProducts: jest.fn() }));

jest.mock('../components/AuthContext', () => ({ useAuth: jest.fn() }));

jest.mock('../components/OrderRevenueMetrics', () => ({
  __esModule: true,
  default: () => React.createElement('OrderRevenueMetrics', null, 'metrics'),
}));

describe('StoreDashboardScreen', () => {
  const { useLocalSearchParams, router } = require('expo-router');
  const { getStore } = require('../services/tonStores');
  const { listProducts } = require('../services/tonProducts');
  const { useAuth } = require('../components/AuthContext');

  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ storeId: 's1' });
    router.replace.mockReset();
    listProducts.mockReset();
    getStore.mockReset();
    useAuth.mockReset();
  });

  it('shows metrics for store owner', async () => {
    getStore.mockResolvedValue({ id: 's1', owner: 'owner1', name: 'Store' });
    listProducts.mockResolvedValue([
      { id: 'p1', storeId: 's1' },
      { id: 'p2', storeId: 's1' },
    ]);
    useAuth.mockReturnValue({ user: { address: 'owner1' } });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreDashboardScreen />);
    });
    await act(async () => {});
    const str = JSON.stringify(root!.toJSON());
    expect(str).toContain('מוצרים: 2');
    expect(str).toContain('metrics');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('redirects if not owner', async () => {
    getStore.mockResolvedValue({ id: 's1', owner: 'owner1', name: 'Store' });
    useAuth.mockReturnValue({ user: { address: 'other' } });
    listProducts.mockResolvedValue([]);

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreDashboardScreen />);
    });
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith('/store/s1');
    expect(root!.toJSON()).toBeNull();
  });

  it('redirects platform admin without impersonation', async () => {
    getStore.mockResolvedValue({ id: 's1', owner: 'owner1', name: 'Store' });
    useAuth.mockReturnValue({ user: { address: 'admin', role: 'platform-admin' } });
    listProducts.mockResolvedValue([]);

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreDashboardScreen />);
    });
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith('/store/s1');
    expect(root!.toJSON()).toBeNull();
  });

  it('allows platform admin with impersonation', async () => {
    useLocalSearchParams.mockReturnValue({ storeId: 's1', impersonate: 'true' });
    getStore.mockResolvedValue({ id: 's1', owner: 'owner1', name: 'Store' });
    listProducts.mockResolvedValue([
      { id: 'p1', storeId: 's1' },
      { id: 'p2', storeId: 's1' },
    ]);
    useAuth.mockReturnValue({ user: { address: 'admin', role: 'platform-admin' } });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreDashboardScreen />);
    });
    await act(async () => {});
    const str = JSON.stringify(root!.toJSON());
    expect(str).toContain('מוצרים: 2');
    expect(router.replace).not.toHaveBeenCalled();
  });
});
