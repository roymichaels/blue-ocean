import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ProductDetailScreen from '@/app/store/[storeId]/product/_ProductScreen';

type Variant = { id?: string; color?: string; stock?: number };
type MediaItem = { uri: string };

type ProductLike = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  storeId: string;
  images: string[];
  variants?: Variant[];
  disabled?: boolean;
  disabledReason?: string;
};

type ProductDetailState = {
  product: ProductLike | null;
  isLoading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  error: Error | null;
  quantity: number;
  incrementQuantity: () => void;
  decrementQuantity: () => void;
  setQuantity: (qty: number) => void;
  effectivePrice: number;
  totalPrice: number;
  currentPricingTier: unknown;
  showTieredPricing: boolean;
  media: MediaItem[];
  mainImageUri?: string;
  isFavorite: boolean;
  toggleFavorite: () => Promise<void>;
  notFound: boolean;
};

type ProductDetailOverrides =
  Partial<Omit<ProductDetailState, 'product'>> & { product?: Partial<ProductLike> };

const mockUseProductDetail = jest.fn<ProductDetailState, []>();

const galleryUris = [
  'https://example.com/gallery-1.jpg',
  'https://example.com/gallery-2.jpg',
];

function buildProductDetail(overrides: ProductDetailOverrides = {}): ProductDetailState {
  const { product: productOverride, media: mediaOverride, mainImageUri, ...restOverrides } = overrides;

  const baseProduct: ProductLike = {
    id: 'prod-1',
    name: 'Test Product',
    description: 'Detailed description',
    price: 25,
    stock: 6,
    storeId: 'store-1',
    images: ['https://example.com/main.jpg'],
    variants: [
      { id: 'variant-1', color: 'Crimson', stock: 4 },
      { id: 'variant-2', color: 'Ocean', stock: 3 },
    ],
    disabled: false,
  };

  const productOverrides: Partial<ProductLike> = productOverride ?? {};
  const variantSource = Array.isArray(productOverrides.variants)
    ? productOverrides.variants
    : baseProduct.variants ?? [];
  const productVariants = variantSource.map((variant) => ({ ...variant }));

  const finalProduct: ProductLike = {
    ...baseProduct,
    ...productOverrides,
    variants: productVariants,
  };

  const media = mediaOverride
    ? mediaOverride.map((item) => ({ ...item }))
    : galleryUris.map((uri) => ({ uri }));

  const baseDetail: ProductDetailState = {
    product: finalProduct,
    isLoading: false,
    refreshing: false,
    refresh: jest.fn(async () => {}),
    error: null,
    quantity: 1,
    incrementQuantity: jest.fn(),
    decrementQuantity: jest.fn(),
    setQuantity: jest.fn(),
    effectivePrice: finalProduct.price,
    totalPrice: finalProduct.price,
    currentPricingTier: null,
    showTieredPricing: false,
    media,
    mainImageUri: finalProduct.images[0],
    isFavorite: false,
    toggleFavorite: jest.fn(async () => {}),
    notFound: false,
  };

  const detail: ProductDetailState = { ...baseDetail, ...restOverrides };
  detail.product = finalProduct;
  detail.media = media;
  detail.mainImageUri = mainImageUri ?? finalProduct.images[0];

  return detail;
}

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ storeId: 'store-1', productId: 'prod-1' }),
}));

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      canvas: '#ffffff',
      surface: { primary: '#ffffff', secondary: '#f5f5f5' },
      text: { primary: '#111111', secondary: '#444444', inverse: '#ffffff' },
      border: { primary: '#cccccc', focus: '#ffdd00' },
      interactive: { primary: '#0055ff', secondary: '#dde6ff' },
      status: { error: '#ff3344' },
      gold: '#ffcc00',
    },
  }),
  useLanguage: () => ({
    t: (_key: string, fallback?: string, params?: Record<string, unknown>) => {
      if (typeof fallback !== 'string') return _key;
      if (!params) return fallback;
      return fallback.replace(/\{(\w+)\}/g, (_match, name) =>
        Object.prototype.hasOwnProperty.call(params, name)
          ? String(params[name])
          : `{${String(name)}}`,
      );
    },
  }),
}));

jest.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ currencySymbol: '$' }),
}));

jest.mock('@/components/NotificationContext', () => ({
  useNotificationActions: () => ({ showNotification: jest.fn() }),
}));

jest.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: true }),
}));

jest.mock('@/features/auth/AuthModalContext', () => ({
  useAuthModal: () => ({ openAuthModal: jest.fn() }),
}));

jest.mock('@/hooks/openDM', () => ({
  openDM: jest.fn(),
}));

jest.mock('@/features/cart/services/cart', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      addToCart: jest.fn(),
    }),
  },
}));

jest.mock('@/features/products/hooks/useProductDetail', () => ({
  __esModule: true,
  useProductDetail: () => mockUseProductDetail(),
  default: () => mockUseProductDetail(),
}));

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: ({ accessibilityRole = 'image', ...props }: any) =>
      React.createElement('ExpoImage', { accessibilityRole, ...props }),
  };
});

async function renderScreen() {
  let root: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    root = renderer.create(<ProductDetailScreen />);
  });
  await act(async () => {});
  return root!;
}

describe('ProductDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProductDetail.mockImplementation(() => buildProductDetail());
  });

  it('updates the selected variant when a different option is pressed', async () => {
    const root = await renderScreen();

    const variantOptions = root.root.findAll(
      (node) => node.props?.accessibilityRole === 'radio',
    );

    expect(variantOptions).toHaveLength(2);
    expect(variantOptions[0].props.accessibilityState.selected).toBe(true);
    expect(variantOptions[1].props.accessibilityState.selected).toBe(false);

    await act(async () => {
      variantOptions[1].props.onPress();
    });

    const updatedOptions = root.root.findAll(
      (node) => node.props?.accessibilityRole === 'radio',
    );

    expect(updatedOptions[0].props.accessibilityState.selected).toBe(false);
    expect(updatedOptions[1].props.accessibilityState.selected).toBe(true);
  });

  it('disables add-to-cart when the selected variant has no stock', async () => {
    mockUseProductDetail.mockImplementation(() =>
      buildProductDetail({
        product: {
          stock: 0,
          variants: [{ id: 'variant-1', color: 'Gray', stock: 0 }],
        },
      }),
    );

    const root = await renderScreen();
    const addToCartButton = root.root.find(
      (node) => node.props?.accessibilityLabel === 'Add to cart',
    );

    expect(addToCartButton.props.disabled).toBe(true);
  });

  it('disables add-to-cart when the product is marked disabled', async () => {
    mockUseProductDetail.mockImplementation(() =>
      buildProductDetail({
        product: { disabled: true, disabledReason: 'Unavailable' },
      }),
    );

    const root = await renderScreen();
    const addToCartButton = root.root.find(
      (node) => node.props?.accessibilityLabel === 'Add to cart',
    );

    expect(addToCartButton.props.disabled).toBe(true);
  });

  it('renders gallery media with an image accessibility role', async () => {
    const root = await renderScreen();
    const galleryImages = root.root.findAll(
      (node) => node.props?.accessibilityRole === 'image' && node.props?.width === 120,
    );

    expect(galleryImages).toHaveLength(galleryUris.length);
    expect(galleryImages.map((img) => img.props.source?.uri)).toEqual(galleryUris);
  });
});
