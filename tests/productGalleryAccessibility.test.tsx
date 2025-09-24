import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ProductDetailScreen from '@app/store/[storeId]/product/_ProductScreen';

let mockSmartImage: jest.Mock;
const mockUseProductDetail = jest.fn();
const mockCartServiceInstance = {
  addToCart: jest.fn(),
  isInWishlist: jest.fn(() => false),
  removeFromWishlist: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

jest.mock('@/features/cart/services/cart', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockCartServiceInstance,
  },
}));

jest.mock('@/components/SmartImage', () => ({
  __esModule: true,
  default: (...args: any[]) => {
    if (!mockSmartImage) {
      mockSmartImage = jest.fn(() => null);
    }
    return mockSmartImage(...args);
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ storeId: 'store-1', productId: 'product-1' }),
}));

const renderTemplate = (template: string, options?: Record<string, string | number>) =>
  template.replace(/\{(.*?)\}/g, (_, key) => String(options?.[key] ?? ''));

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      canvas: '#ffffff',
      surface: { primary: '#ffffff', secondary: '#f4f4f4' },
      text: { primary: '#111111', secondary: '#666666', inverse: '#ffffff' },
      border: { primary: '#cccccc' },
      interactive: { secondary: '#eeeeee' },
      status: { error: '#ff0000' },
      gold: '#ffcc00',
    },
  }),
  useLanguage: () => ({
    t: (key: string, fallbackOrOptions?: any, maybeOptions?: any) => {
      if (typeof fallbackOrOptions === 'string') {
        return renderTemplate(fallbackOrOptions, maybeOptions);
      }
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object') {
        return renderTemplate(key, fallbackOrOptions);
      }
      return key;
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

jest.mock('@/ui/primitives', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Heading: ({ children, ...rest }: any) => React.createElement(Text, rest, children),
    Text,
    Button: ({ children, ...rest }: any) => React.createElement('Button', rest, children),
    Skeleton: (props: any) => React.createElement('Skeleton', props),
  };
});

jest.mock('@/features/products/hooks/useProductDetail', () => ({
  __esModule: true,
  useProductDetail: (...args: any[]) => mockUseProductDetail(...args),
  default: (...args: any[]) => mockUseProductDetail(...args),
}));

const mediaItems = [
  {
    id: 'image-1',
    uri: 'https://example.com/image-1.jpg',
    type: 'image' as const,
    name: 'Front view',
  },
  {
    id: 'image-2',
    uri: 'https://example.com/image-2.jpg',
    type: 'image' as const,
    name: 'Side profile',
  },
];

describe('Product gallery accessibility', () => {
  beforeEach(() => {
    if (mockSmartImage) {
      mockSmartImage.mockReset();
    }
    mockSmartImage = jest.fn(() => null);
    mockUseProductDetail.mockReset();

    mockUseProductDetail.mockReturnValue({
      product: {
        id: 'product-1',
        storeId: 'store-1',
        name: 'Accessible Product',
        description: 'A demo product',
        price: 19.99,
        stock: 5,
        images: ['https://example.com/main.jpg'],
        variants: [],
        disabled: false,
      },
      isLoading: false,
      refreshing: false,
      refresh: jest.fn(),
      error: null,
      quantity: 1,
      incrementQuantity: jest.fn(),
      decrementQuantity: jest.fn(),
      setQuantity: jest.fn(),
      effectivePrice: 19.99,
      totalPrice: 19.99,
      currentPricingTier: null,
      showTieredPricing: false,
      media: mediaItems,
      mainImageUri: 'https://example.com/main.jpg',
      isFavorite: false,
      toggleFavorite: jest.fn(),
      notFound: false,
    });
  });

  const renderProductGallery = async () => {
    let testRenderer: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = renderer.create(<ProductDetailScreen />);
    });

    if (!testRenderer) {
      throw new Error('Failed to render the product gallery');
    }

    return testRenderer;
  };

  it('provides accessibility metadata for gallery images', async () => {
    const testRenderer = await renderProductGallery();

    const galleryImageProps = mockSmartImage.mock.calls.reduce<Record<string, any>[]>(
      (acc, call) => {
        const props = (call as any[])[0] as Record<string, any> | undefined;
        if (props && props.width === 120 && props.height === 120) {
          acc.push(props);
        }
        return acc;
      },
      [],
    );

    expect(galleryImageProps).toHaveLength(mediaItems.length);
    expect(galleryImageProps.every((props) => props.accessibilityRole === 'image')).toBe(true);
    expect(galleryImageProps[0].accessibilityLabel).toBe(
      'Front view for Accessible Product. Item 1 of 2.',
    );
    expect(galleryImageProps[1].accessibilityLabel).toBe(
      'Side profile for Accessible Product. Item 2 of 2.',
    );

    testRenderer.unmount();
  });

  it('announces how to browse the gallery', async () => {
    const testRenderer = await renderProductGallery();

    const horizontalScrollViews = testRenderer.root.findAll(
      (node) => Boolean(node.props?.horizontal),
    );

    expect(horizontalScrollViews.length).toBeGreaterThan(0);

    const galleryScrollView = horizontalScrollViews[0];

    expect(galleryScrollView.props.accessibilityHint).toBe(
      'Swipe left or right to browse more media items.',
    );

    testRenderer.unmount();
  });
});
