import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StoreScreen from '@app/store/[storeId]';

const mockUseStoreProfile = jest.fn();
const mockUseProducts = jest.fn();
const mockUseCategories = jest.fn();
const mockUseStoreReviews = jest.fn();
const mockUseAppRouter = { push: jest.fn() };
const mockOpenDM = jest.fn();
const mockOpenProduct = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ storeId: 'store-1' }),
}));

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: { primary: '#ffffff', secondary: '#f5f5f5' },
      text: { primary: '#111', secondary: '#666', inverse: '#fff' },
      border: { primary: '#ddd' },
      gold: '#ffd700',
      status: { warning: '#ff8800' },
    },
  }),
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    isRTL: false,
  }),
}));

jest.mock('@/components/NotificationContext', () => ({
  useNotificationActions: () => ({ showNotification: jest.fn() }),
}));

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: true }),
}));

jest.mock('@/features/auth/AuthModalContext', () => ({
  useAuthModal: () => ({ openAuthModal: jest.fn() }),
}));

jest.mock('@/features/stores/hooks/useStoreProfile', () => ({
  useStoreProfile: (id: string) => mockUseStoreProfile(id),
}));

jest.mock('@/services', () => ({
  useProducts: (...args: any[]) => mockUseProducts(...args),
  useCategories: (...args: any[]) => mockUseCategories(...args),
  useStoreReviews: (...args: any[]) => mockUseStoreReviews(...args),
}));

jest.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => mockUseAppRouter,
}));

jest.mock('@/hooks/openDM', () => ({
  openDM: (...args: any[]) => mockOpenDM(...args),
}));

jest.mock('@/hooks/openProduct', () => ({
  openProduct: (...args: any[]) => mockOpenProduct(...args),
}));

jest.mock('@/features/home/components/CategoryChips', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('CategoryChips', props),
}));

jest.mock('@/features/products', () => ({
  ProductGrid: ({ products, loading }: any) =>
    loading
      ? React.createElement('ProductSkeleton')
      : React.createElement(
          'ProductGrid',
          null,
          products.map((p: any) =>
            React.createElement('Product', { key: p.id }, p.name),
          ),
        ),
  ProductCardSkeleton: () => React.createElement('ProductSkeleton'),
}));

jest.mock('@/shared/ui/EmptyState', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('EmptyState', props, props.title),
}));

describe('StoreScreen (public view)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStoreProfile.mockReturnValue({
      store: null,
      isLoading: false,
      error: null,
      source: null,
      isOffline: false,
    });
    mockUseProducts.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      error: null,
    });
    mockUseCategories.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      error: null,
    });
    mockUseStoreReviews.mockReturnValue({ data: { score: 0 } });
  });

  it('renders store hero with accessible media', async () => {
    mockUseStoreProfile.mockReturnValue({
      store: {
        id: 'store-1',
        name: 'Test Store',
        owner: 'owner.test',
        nftId: 'nft',
        bannerUri: 'banner.png',
        avatarUri: 'avatar.png',
        tagline: 'Fresh goods daily',
      } as any,
      isLoading: false,
      error: null,
      source: 'network',
      isOffline: false,
    });
    mockUseProducts.mockReturnValue({
      data: [
        {
          id: 'prod-1',
          name: 'Apples',
          price: 3,
          description: '',
          category: 'fruit',
          images: [],
          rating: 4,
          reviews: 2,
          storeId: 'store-1',
          stock: 5,
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      error: null,
    });
    mockUseStoreReviews.mockReturnValue({ data: { score: 4.2 } });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreScreen />);
    });

    const tree = root!.toJSON();
    expect(tree).toMatchSnapshot();
    const json = JSON.stringify(tree);
    expect(json).toContain('Store banner for Test Store');
    expect(json).toContain('Store avatar for Test Store');
  });

  it('shows skeletons while loading store data', async () => {
    mockUseStoreProfile.mockReturnValue({
      store: null,
      isLoading: true,
      error: null,
      source: null,
      isOffline: false,
    });
    mockUseProducts.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
      isRefetching: false,
      error: null,
    });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreScreen />);
    });

    const tree = root!.toJSON();
    const json = JSON.stringify(tree);
    expect(json).toContain('ProductSkeleton');
  });

  it('renders offline notice when using cached data', async () => {
    mockUseStoreProfile.mockReturnValue({
      store: {
        id: 'store-1',
        name: 'Cached Store',
        owner: 'owner',
        nftId: 'nft',
      } as any,
      isLoading: false,
      error: null,
      source: 'cache',
      isOffline: true,
    });
    mockUseProducts.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      error: null,
    });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreScreen />);
    });

    const tree = root!.toJSON();
    const json = JSON.stringify(tree);
    expect(json).toContain('Viewing cached data. Some details may be out of date.');
  });
});
