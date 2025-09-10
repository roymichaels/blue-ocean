// @ts-nocheck
const ReactNative = require('react');
const renderer = require('react-test-renderer');
const { act } = renderer;

jest.mock('expo-secure-store');

// Mock ScrollArea to expose style and contentContainerStyle
jest.mock('@/ui/layout/ScrollArea', () => {
  const ReactMock = require('react');
  return ({ style, contentContainerStyle, children, ...props }: any) =>
    ReactMock.createElement('ScrollArea', { style, contentContainerStyle, ...props }, children);
});

const HomeScreen = require('@app/index').default;

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

jest.mock('@/features/home/hooks/useHome', () => ({
  useHome: () => ({
    products: [],
    categories: [],
    loading: false,
    refreshing: false,
    error: null,
    refresh: jest.fn(),
    upsertProduct: jest.fn(),
    removeProduct: jest.fn(),
  }),
}));

jest.mock('@/features/home/hooks/useHomeBanners', () => ({
  useHomeBanners: () => ({
    heroBanners: [],
    loading: false,
    refreshing: false,
    error: null,
    refresh: jest.fn(),
    upsertBanner: jest.fn(),
    removeBanner: jest.fn(),
  }),
}));

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

describe('HomeScreen fallback visibility', () => {
  it('displays fallback data and keeps ScrollArea expanded', async () => {
    let root;
    await act(async () => {
      root = renderer.create(ReactNative.createElement(HomeScreen));
    });
    await act(async () => {});

    const scrollArea = root.root.findByProps({ testID: 'home-root' });
    expect(scrollArea.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flex: 1 })])
    );

    const tree = root.toJSON();
    const str = JSON.stringify(tree);
    expect(str).toContain('categories.electronics');
    expect(str).toContain('home.fallbackBanner1Title');
    expect(str).toContain('home.noProducts');
  });
});

