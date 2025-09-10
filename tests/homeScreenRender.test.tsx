import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('expo-secure-store');

const mockUseTenant = jest.fn();
jest.mock('@/contexts/TenantContext', () => ({
  useTenant: () => mockUseTenant(),
}));

const mockUseHome = jest.fn();
jest.mock('@/features/home/hooks/useHome', () => ({
  useHome: (tenantId: string) => mockUseHome(tenantId),
}));


const mockCategoryChips = jest.fn(() => null);
jest.mock('@/features/home/components/CategoryChips', () => ({
  __esModule: true,
  default: (props: any) => mockCategoryChips(props),
}));

const mockProductGrid = jest.fn(() => null);
jest.mock('@/features/home/components/ProductGrid', () => ({
  __esModule: true,
  default: (props: any) => mockProductGrid(props),
}));

jest.mock('@/services', () => ({
  useAppRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  usePathname: () => '/index',
  router: { replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});
jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({ address: 'test', connect: jest.fn() }),
}));

jest.mock('@features/auth/AuthContext', () => ({
  useAuth: () => ({ isStoreOwner: false }),
}));

jest.mock('@/ui/ThemeProvider', () => {
  const colors = {
    background: '#fff',
    canvas: '#fff',
    text: { primary: '#000', secondary: '#333', tertiary: '#666', inverse: '#fff' },
    border: { primary: '#000', secondary: '#ccc' },
    gold: '#FFD700',
    surface: { primary: '#fff', elevated: '#eee' },
    interactive: { secondary: '#eee', disabled: '#999' },
  };
  return {
    useLanguage: () => ({ t: (s: string) => s }),
    useTheme: () => ({
      colors,
      getColor: (path: string) => path.split('.').reduce((acc: any, key) => (acc ? acc[key] : undefined), colors),
    }),
  };
});

jest.mock('@/components/BannerFormModal', () => () => null);
jest.mock('@features/cart', () => ({ CartModal: () => null }));
jest.mock('@features/products', () => ({
  ProductFormModal: () => null,
  ProductCard: () => null,
  ProductCardSkeleton: () => null,
}));
jest.mock('@/components/InfoModal', () => () => null);
jest.mock('@/components/SmartImage', () => () => null);

jest.mock('@/features/home/hooks/useHomeFilters', () => ({
  useHomeFilters: () => ({
    filteredProducts: [],
    searchQuery: '',
    setSearchQuery: jest.fn(),
    selectedCategory: null,
    setSelectedCategory: jest.fn(),
    minPrice: '',
    setMinPrice: jest.fn(),
    maxPrice: '',
    setMaxPrice: jest.fn(),
    sortBy: 'newest',
    setSortBy: jest.fn(),
    showSortModal: false,
    setShowSortModal: jest.fn(),
  }),
}));

import HomeScreen from '@app/index';

describe('HomeScreen render', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders network mode with hero cards only', async () => {
    mockUseTenant.mockReturnValue({ tenantId: null, isNetwork: true });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<HomeScreen />);
    });
    await act(async () => {});

    const tree = root!.toJSON();
    const str = JSON.stringify(tree);
    expect(str).toContain('home.createStore');
    expect(mockCategoryChips).not.toHaveBeenCalled();
    expect(mockProductGrid).not.toHaveBeenCalled();
    expect(mockUseHome).toHaveBeenCalledWith(null);
  });

  it('renders tenant mode with scoped queries', async () => {
    mockUseTenant.mockReturnValue({ tenantId: 'tenant1', isNetwork: false });
    mockUseHome.mockReturnValue({
      products: [],
      categories: [],
      loading: false,
      refreshing: false,
      error: null,
      refresh: jest.fn(),
      upsertProduct: jest.fn(),
      removeProduct: jest.fn(),
    });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<HomeScreen />);
    });
    await act(async () => {});

    expect(mockCategoryChips).toHaveBeenCalled();
    expect(mockProductGrid).toHaveBeenCalled();
    expect(mockUseHome).toHaveBeenCalledWith('tenant1');
  });
});
