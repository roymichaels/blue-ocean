import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { Product } from '@/types';

jest.mock('expo-secure-store');

const mockTrack = jest.fn(async () => {});
const mockPublish = jest.fn(async () => {});
jest.mock('@/services/eventBus', () => ({
  __esModule: true,
  default: { track: mockTrack, publish: mockPublish },
  track: mockTrack,
  publish: mockPublish,
}));

const mockUseTenant = jest.fn();
jest.mock('@/contexts/TenantContext', () => ({
  useTenant: () => mockUseTenant(),
}));

const mockUseHome = jest.fn();
jest.mock('@/features/home/hooks/useHome', () => ({
  useHome: (tenantId: string | null) => mockUseHome(tenantId),
}));

const mockUseHomeModals = jest.fn();
jest.mock('@/features/home/hooks/useHomeModals', () => ({
  useHomeModals: (error: unknown) => mockUseHomeModals(error),
}));

const mockUseHomeData = jest.fn();
jest.mock('@/features/home/hooks/useHomeData', () => ({
  useHomeData: () => mockUseHomeData(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAppInfo = jest.fn();
jest.mock('@/contexts/AppInfoContext', () => ({
  useAppInfo: () => mockUseAppInfo(),
}));

const mockUseAppRouter = jest.fn();
jest.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => mockUseAppRouter(),
}));

const themeColors = {
  canvas: '#fff',
  surface: { primary: '#f8f8f8' },
  text: { primary: '#111', secondary: '#555' },
  border: { primary: '#222' },
  interactive: { secondary: '#ddd' },
  gold: '#fdd835',
  muted: '#999',
};

jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => ({
    t: (key: string, value?: any) => {
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value === 'object' && 'query' in value) {
        return `${key}:${value.query}`;
      }
      return key;
    },
  }),
  useTheme: () => ({
    colors: themeColors,
    getColor: (path: string) =>
      path.split('.').reduce((acc: any, piece: string) => (acc ? acc[piece] : undefined), themeColors),
  }),
}));

jest.mock('@/components/SmartImage', () => () => null);
jest.mock('@/features/home/components/PromoCard', () => () => null);
jest.mock('@/features/home/components/PriceRange', () => () => null);
jest.mock('@/features/home/components/CategoryChips', () => () => null);
jest.mock('@/features/home/components/HomeOptions', () => () => null);
jest.mock('@/features/home/components/FeaturedStoresCarousel', () => () => null);
jest.mock('@/features/home/components/CategoryCard', () => () => null);
jest.mock('@/features/home/components/HeroCallout', () => () => null);
jest.mock('@/features/home/components/AdminOnboardingChecklist', () => () => null);

jest.mock('@/components/InfoModal', () => () => null);
jest.mock('@/features/home/components/SortModal', () => () => null);
jest.mock('@/features/cart', () => ({ CartModal: () => null }));

jest.mock('@/features/products', () => {
  const actual = jest.requireActual('@/features/products');
  return {
    ...actual,
    ProductFormModal: () => null,
  };
});

const mockUseProductCard = jest.fn();
jest.mock('@/features/products/hooks/useProductCard', () => ({
  __esModule: true,
  useProductCard: (product: Product) => mockUseProductCard(product),
  default: (product: Product) => mockUseProductCard(product),
}));

let latestSearchBarProps: any = null;
const mockSearchBar = jest.fn((props: any) => {
  latestSearchBarProps = props;
  return null;
});
jest.mock('@/features/home/components/SearchBar', () => ({
  __esModule: true,
  default: (props: any) => mockSearchBar(props),
}));

let latestProductGridProps: any = null;
const productCardLabels: string[] = [];
const mockProductGrid = jest.fn((props: any) => {
  latestProductGridProps = props;
  if (props?.products) {
    props.products.forEach((product: Product) => {
      const cardState = mockUseProductCard(product);
      const label = cardState?.price ? `${product.name}, ${cardState.price}` : product.name;
      productCardLabels.push(label);
    });
  }
  return null;
});
jest.mock('@/features/home/components/ProductGrid', () => ({
  __esModule: true,
  default: (props: any) => mockProductGrid(props),
}));

import HomeScreen from '@app/index';
import { localIndex } from '@/services/localIndex';

const baseProducts: Product[] = [
  {
    id: 'p1',
    tenant_id: 'tenant-123',
    name: 'שלום',
    name_en: 'Shalom',
    name_he: 'שָׁלוֹם',
    price: 42,
    originalPrice: undefined,
    description: 'Greeting card',
    description_en: 'Greeting card',
    description_he: 'כרטיס ברכה',
    category: 'gifts',
    subcategory: 'cards',
    images: ['ipfs://p1'],
    videos: [],
    colors: [],
    variants: [],
    rating: 4.8,
    reviews: 10,
    badges: [],
    pricingTier: undefined,
    mixGroupId: undefined,
    storeId: 'store-1',
    stock: 5,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-02T00:00:00.000Z',
  },
  {
    id: 'p2',
    tenant_id: 'tenant-123',
    name: 'Espresso Maker',
    name_en: 'Espresso Maker',
    name_he: 'מכונת אספרסו',
    price: 120,
    originalPrice: undefined,
    description: 'Stovetop espresso maker',
    description_en: 'Stovetop espresso maker',
    description_he: 'מכונת קפה',
    category: 'kitchen',
    subcategory: 'coffee',
    images: ['ipfs://p2'],
    videos: [],
    colors: [],
    variants: [],
    rating: 4.3,
    reviews: 7,
    badges: [],
    pricingTier: undefined,
    mixGroupId: undefined,
    storeId: 'store-1',
    stock: 3,
    createdAt: '2023-02-01T00:00:00.000Z',
    updatedAt: '2023-02-02T00:00:00.000Z',
  },
];

const cloneProducts = () =>
  baseProducts.map((product) => ({
    ...product,
    images: [...product.images],
    videos: product.videos ? [...product.videos] : undefined,
    colors: product.colors ? [...product.colors] : undefined,
    variants: product.variants ? [...product.variants] : undefined,
  }));

let homeProducts: Product[] = [];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function getSearchHandler(): (value: string) => void {
  const handler = latestSearchBarProps?.onSearchChange;
  if (!handler) {
    throw new Error('Search handler not initialised');
  }
  return handler;
}

function getLastProductGridProps() {
  const lastCall = mockProductGrid.mock.calls[mockProductGrid.mock.calls.length - 1];
  return lastCall ? lastCall[0] : null;
}

function createModalsMock() {
  return {
    productFormVisible: false,
    productToEdit: null,
    openProductForm: jest.fn(),
    closeProductForm: jest.fn(),
    showCartModal: false,
    closeCartModal: jest.fn(),
    infoModal: {
      visible: false,
      title: '',
      message: '',
      type: 'info',
      buttonText: '',
    },
    closeInfoModal: jest.fn(),
  };
}

async function renderHome() {
  let root: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(<HomeScreen />);
  });
  await flushMicrotasks();
  return root!;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  latestSearchBarProps = null;
  latestProductGridProps = null;
  productCardLabels.length = 0;
  homeProducts = cloneProducts();
  mockTrack.mockResolvedValue(undefined);
  mockPublish.mockResolvedValue(undefined);

  mockUseTenant.mockReturnValue({ tenantId: 'tenant-123', isNetwork: false });
  mockUseHome.mockReturnValue({
    products: homeProducts,
    categories: [],
    loading: false,
    refreshing: false,
    error: null,
    refresh: jest.fn(),
    upsertProduct: jest.fn(),
    removeProduct: jest.fn(),
  });
  mockUseHomeModals.mockReturnValue(createModalsMock());
  mockUseHomeData.mockReturnValue({ fallbackCategories: [], fallbackBanners: [] });
  mockUseAuth.mockReturnValue({ isStoreOwner: false });
  mockUseAppInfo.mockReturnValue({ appName: 'Blue Ocean', logoCid: null });
  mockUseAppRouter.mockReturnValue({ push: jest.fn(), replace: jest.fn(), back: jest.fn() });
  mockUseProductCard.mockImplementation(() => ({
    isInWishlist: false,
    handleWishlistPress: jest.fn(),
    price: '',
    originalPrice: undefined,
  }));

  mockSearchBar.mockClear();
  mockProductGrid.mockClear();
  localIndex.setProducts([]);
});

afterEach(() => {
  jest.useRealTimers();
});

async function triggerSearch(query: string) {
  const handler = getSearchHandler();
  act(() => {
    handler(query);
  });
  await flushMicrotasks();
}

function expectProductsMatch(expected: Product[]) {
  const props = getLastProductGridProps();
  expect(props).not.toBeNull();
  expect(props.products.map((p: Product) => p.id)).toEqual(expected.map((p) => p.id));
}

function getRecordedLabels() {
  return [...productCardLabels];
}

it('matches Hebrew queries regardless of niqqud', async () => {
  const querySpy = jest.spyOn(localIndex, 'query');
  const root = await renderHome();
  expect(root).toBeDefined();

  querySpy.mockClear();
  mockProductGrid.mockClear();

  await triggerSearch('שָׁלוֹם');

  expect(querySpy.mock.calls.some((call) => call[0] === 'שָׁלוֹם')).toBe(true);
  expectProductsMatch([homeProducts[0]]);

  await wait(200);

  querySpy.mockClear();
  mockProductGrid.mockClear();

  await triggerSearch('שלום');

  expect(querySpy.mock.calls.some((call) => call[0] === 'שלום')).toBe(true);
  expectProductsMatch([homeProducts[0]]);

  querySpy.mockRestore();
});

it('throttles rapid search input', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(1_000);

  const querySpy = jest
    .spyOn(localIndex, 'query')
    .mockResolvedValue({ products: [...homeProducts], total: homeProducts.length });

  await renderHome();
  querySpy.mockClear();
  mockProductGrid.mockClear();

  await triggerSearch('espresso');
  expect(querySpy).toHaveBeenCalledTimes(1);

  await triggerSearch('espresso m');
  expect(querySpy).toHaveBeenCalledTimes(1);

  await triggerSearch('espresso macchiato');
  expect(querySpy).toHaveBeenCalledTimes(1);

  act(() => {
    jest.advanceTimersByTime(150);
  });
  await flushMicrotasks();

  expect(querySpy).toHaveBeenCalledTimes(2);
  expect(querySpy.mock.calls[1][0]).toBe('espresso macchiato');

  const props = getLastProductGridProps();
  expect(props.searchQuery).toBe('espresso macchiato');

  querySpy.mockRestore();
});

it('handles empty search results', async () => {
  const querySpy = jest
    .spyOn(localIndex, 'query')
    .mockImplementation(async (text: string) => {
      if (!text) {
        return { products: [...homeProducts], total: homeProducts.length };
      }
      return { products: [], total: 0 };
    });

  await renderHome();
  querySpy.mockClear();
  mockProductGrid.mockClear();

  await triggerSearch('missing item');

  expect(querySpy).toHaveBeenCalledWith('missing item');
  const props = getLastProductGridProps();
  expect(props.products).toHaveLength(0);
  expect(props.searchQuery).toBe('missing item');

  querySpy.mockRestore();
});

it('falls back to original products when search fails', async () => {
  const querySpy = jest
    .spyOn(localIndex, 'query')
    .mockImplementation(async (text: string) => {
      if (!text) {
        return { products: [...homeProducts], total: homeProducts.length };
      }
      if (text === 'trigger error') {
        throw new Error('local index failure');
      }
      return { products: [], total: 0 };
    });

  await renderHome();
  querySpy.mockClear();
  mockProductGrid.mockClear();

  await triggerSearch('trigger error');

  expect(querySpy).toHaveBeenCalledWith('trigger error');
  expectProductsMatch(homeProducts);
  const props = getLastProductGridProps();
  expect(props.searchQuery).toBe('trigger error');

  querySpy.mockRestore();
});

it('captures product accessibility labels using card pricing data', async () => {
  await renderHome();
  mockUseProductCard.mockImplementation((product: Product) => ({
    isInWishlist: false,
    handleWishlistPress: jest.fn(),
    price: product.id === 'p2' ? '₪199.99' : '',
    originalPrice: undefined,
  }));

  mockProductGrid.mockClear();
  productCardLabels.length = 0;

  await triggerSearch('Espresso Maker');

  expect(getRecordedLabels()).toContain(`${homeProducts[1].name}, ₪199.99`);
});

it('emits analytics events when running a search', async () => {
  const querySpy = jest
    .spyOn(localIndex, 'query')
    .mockResolvedValue({ products: [...homeProducts], total: homeProducts.length });

  await renderHome();
  mockTrack.mockClear();
  mockProductGrid.mockClear();

  await triggerSearch('espresso machines');

  expect(mockTrack).toHaveBeenCalledWith('search.query', { query: 'espresso machines' });
  const props = getLastProductGridProps();
  expect(props.searchQuery).toBe('espresso machines');

  querySpy.mockRestore();
});

