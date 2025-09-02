import React from 'react';
import renderer from 'react-test-renderer';
import { Text } from 'react-native';
import HomeScreen from '../app/(tabs)/index';

jest.mock('../hooks/useAppRouter', () => () => ({ push: jest.fn() }));
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
jest.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ isStoreOwner: false }),
}));
jest.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#fff', text: { primary: '#000', secondary: '#333' } } }),
}));
jest.mock('../features/home/components/HomeHeader', () => {
  const React = require('react');
  return () => {
    throw new Error('boom');
  };
});
jest.mock('../features/home/components/CategoryTabs', () => () => null);
jest.mock('../features/home/components/ProductGrid', () => () => null);
jest.mock('../shared/ui/Spinner', () => () => null);
jest.mock('../shared/ui/EmptyState', () => () => null);
jest.mock('../components/BannerFormModal', () => () => null);
jest.mock('../features/cart/components/CartModal', () => () => null);
jest.mock('../features/products/components/ProductFormModal', () => () => null);
jest.mock('../components/SmartImage', () => () => null);
jest.mock('../components/InfoModal', () => () => null);
jest.mock('../services/database', () => ({}));
jest.mock('../services/chain', () => 'near');
jest.mock('../features/products/services/nearCategories', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('../features/home/hooks/useHomeScreen', () => ({
  useHomeScreen: () => ({
    filteredProducts: [],
    searchQuery: '',
    setSearchQuery: jest.fn(),
    selectedCategory: null,
    setSelectedCategory: jest.fn(),
    minPrice: null,
    setMinPrice: jest.fn(),
    maxPrice: null,
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
