import React from 'react';
import renderer from 'react-test-renderer';
import { Text } from 'react-native';
import HomeScreen from '@app/index';

const InfoModalMock: jest.Mock = jest.fn();

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
jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({ address: 'test', connect: jest.fn() }),
}));
jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => ({ t: (s: string) => s }),
  useTheme: () => ({ colors: { background: '#fff', text: { primary: '#000', secondary: '#333' } } }),
}));
let homeHeaderThrows = true;
jest.mock('@features/home/components/HomeHeader', () => {
  const React = require('react');
  return () => {
    if (homeHeaderThrows) {
      throw new Error('boom');
    }
    return null;
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
jest.mock('@/components/InfoModal', () => (props: any) => {
  InfoModalMock(props);
  return null;
});
jest.mock('@/services/database', () => ({}));
jest.mock('@/services/chain', () => 'near');
jest.mock('@features/products/services/nearCategories', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
}));
let homeErrorList: (Error | null)[] = [null];
jest.mock('@features/home/hooks/useHome', () => {
  const React = require('react');
  return {
    useHome: () => {
      const [index, setIndex] = React.useState(0);
      const refresh = () => {
        setIndex((i: number) => Math.min(i + 1, homeErrorList.length - 1));
        return Promise.resolve();
      };
      return {
        products: [],
        categories: [],
        refreshing: false,
        refresh,
        upsertProduct: jest.fn(),
        removeProduct: jest.fn(),
        error: homeErrorList[index],
      };
    },
  };
});
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
    homeHeaderThrows = true;
    homeErrorList = [null];
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

  it('reopens InfoModal when a new error occurs', async () => {
    homeHeaderThrows = false;
    homeErrorList = [new Error('first'), new Error('second')];
    InfoModalMock.mockClear();
    renderer.create(<HomeScreen />);
    const firstCall = InfoModalMock.mock.calls[0] as any[];
    expect(firstCall[0].visible).toBe(true);
    await renderer.act(async () => {
      firstCall[0].onClose();
    });
    const visibilities = (InfoModalMock.mock.calls as any[]).map(
      (c: any[]) => c[0].visible,
    );
    expect(visibilities).toEqual([true, false, true]);
  });
});
