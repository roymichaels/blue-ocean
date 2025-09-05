import React from 'react';
import renderer from 'react-test-renderer';
import { Text } from 'react-native';
import HomeScreen from '@app/index';

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
jest.mock('@features/auth/AuthContext', () => ({
  useAuth: () => ({ isStoreOwner: false }),
}));
jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => ({ t: (s: string) => s }),
  useTheme: () => ({ colors: { background: '#fff', text: { primary: '#000', secondary: '#333' } } }),
}));
jest.mock('@features/home/components/HomeHeader', () => {
  const React = require('react');
  return () => {
    throw new Error('boom');
  };
});
jest.mock('@features/home/components/CategoryChips', () => () => null);
jest.mock('@features/home/components/ProductGrid', () => () => null);
jest.mock('@ui/primitives', () => ({ Spinner: () => null }));
jest.mock('@shared/ui/EmptyState', () => () => null);
jest.mock('@/components/BannerFormModal', () => () => null);
jest.mock('@features/cart', () => ({ CartModal: () => null }));
jest.mock('@features/products', () => ({ ProductFormModal: () => null }));
jest.mock('@/components/SmartImage', () => () => null);
jest.mock('@/components/InfoModal', () => () => null);
jest.mock('@/services/database', () => ({}));
jest.mock('@/services/chain', () => 'near');
jest.mock('@features/products/services/nearCategories', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('@features/home/hooks/useHome', () => ({
  useHome: () => ({
    products: [],
    categories: [],
    refreshing: false,
    refresh: jest.fn(),
    upsertProduct: jest.fn(),
    removeProduct: jest.fn(),
    error: null,
  }),
}));
jest.mock('@features/home/hooks/useHomeBanners', () => ({
  useHomeBanners: () => ({
    heroBanners: [],
    refreshing: false,
    refresh: jest.fn(),
    upsertBanner: jest.fn(),
    removeBanner: jest.fn(),
    error: null,
  }),
}));
jest.mock('@features/home/hooks/useHomeFilters', () => ({
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
    sortBy: 'name',
    setSortBy: jest.fn(),
    showSortModal: false,
    setShowSortModal: jest.fn(),
  }),
}));

describe('HomeScreen error handling', () => {
  it('shows fallback and keeps app shell when child throws', () => {
    const App = () => (
      <>
        <HomeScreen />
        <Text>App shell</Text>
      </>
    );
    const root = renderer.create(<App />);
    const tree = root.toJSON();
    const str = JSON.stringify(tree);
    expect(str).toContain('Something went wrong');
    expect(str).toContain('App shell');
    expect(str).toContain('Retry');
  });
});
