import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StoreDashboardScreen from '@app/store/[storeId]/admin/dashboard';
import { routes } from '@/utils/routes';

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
      text: { primary: '#000' },
      border: { primary: '#000' },
    },
  }),
}));

jest.mock('@/features/stores/services/nearStores', () => ({ getStore: jest.fn() }));
jest.mock('@/features/products/services/nearProducts', () => ({ listProducts: jest.fn() }));

jest.mock('@/features/auth/AuthContext', () => ({ useAuth: jest.fn() }));

jest.mock('@/features/stores/components/OrderRevenueMetrics', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('OrderRevenueMetrics', null, 'metrics'),
  };
});

describe('StoreDashboardScreen', () => {
  const { useLocalSearchParams } = require('expo-router');
  const navigation = require('@/services/navigation');
  const { getStore } = require('@/features/stores/services/nearStores');
  const { listProducts } = require('@/features/products/services/nearProducts');
  const { useAuth } = require('@/features/auth/AuthContext');
  const TAB_GROUP = '(' + 'tabs' + ')';

  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ storeId: 's1' });
    navigation.replace.mockClear();
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
      root = renderer.create(React.createElement(StoreDashboardScreen));
    });
    await act(async () => {});
    const str = JSON.stringify(root!.toJSON());
    expect(str).toContain('מוצרים: 2');
    expect(str).toContain('metrics');
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('redirects if not owner', async () => {
    getStore.mockResolvedValue({ id: 's1', owner: 'owner1', name: 'Store' });
    useAuth.mockReturnValue({ user: { address: 'other' } });
    listProducts.mockResolvedValue([]);

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(React.createElement(StoreDashboardScreen));
    });
    await act(async () => {});
    expect(navigation.replace).toHaveBeenCalledWith(routes.store('s1'));
    expect(navigation.replace.mock.calls[0][0]).not.toContain(TAB_GROUP);
    expect(root!.toJSON()).toBeNull();
  });

  it('redirects platform admin without impersonation', async () => {
    getStore.mockResolvedValue({ id: 's1', owner: 'owner1', name: 'Store' });
    useAuth.mockReturnValue({ user: { address: 'admin', role: 'platform-admin' } });
    listProducts.mockResolvedValue([]);

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(React.createElement(StoreDashboardScreen));
    });
    await act(async () => {});
    expect(navigation.replace).toHaveBeenCalledWith(routes.store('s1'));
    expect(navigation.replace.mock.calls[0][0]).not.toContain(TAB_GROUP);
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
      root = renderer.create(React.createElement(StoreDashboardScreen));
    });
    await act(async () => {});
    const str = JSON.stringify(root!.toJSON());
    expect(str).toContain('מוצרים: 2');
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
