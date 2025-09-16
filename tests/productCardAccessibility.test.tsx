import React from 'react';
import renderer from 'react-test-renderer';
import { Pressable } from 'react-native';
import ProductCard from '@/features/products/ProductCard';
import type { Product } from '@/types';

const mockUseProductCard = jest.fn();

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      surface: { primary: '#ffffff' },
      muted: '#f0f0f0',
      text: { primary: '#111111', secondary: '#666666' },
      status: { error: '#ff0000' },
      gold: '#ffcc00',
    },
  }),
}));

jest.mock('@/ui', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Text,
    Button: ({ title, onPress, style }: any) =>
      React.createElement('Button', { title, onPress, style }),
    Skeleton: (props: any) => React.createElement('Skeleton', props),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return {
    Star: (props: any) => React.createElement('Star', props),
    Heart: (props: any) => React.createElement('Heart', props),
  };
});

jest.mock('@/features/products/hooks/useProductCard', () => ({
  __esModule: true,
  useProductCard: (product: Product) => mockUseProductCard(product),
  default: (product: Product) => mockUseProductCard(product),
}));

describe('ProductCard accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses product name and price in accessibility label', () => {
    const product: Product = {
      id: '1',
      name: 'Test Product',
      price: 9.99,
      description: 'A product for testing',
      category: 'category',
      images: [],
      rating: 4.5,
      reviews: 10,
      storeId: 'store',
      stock: 5,
    };
    const onPress = jest.fn();

    mockUseProductCard.mockReturnValue({
      isInWishlist: false,
      pricingTier: null,
      toggleWishlist: jest.fn(),
      handleWishlistPress: jest.fn(),
      price: '$9.99',
      originalPrice: undefined,
    });

    const tree = renderer.create(
      <ProductCard product={product} onPress={onPress} />,
    );

    const pressables = tree.root.findAllByType(Pressable);
    const outerPressable = pressables.find(
      pressable => pressable.props.onPress === onPress,
    );

    expect(outerPressable).toBeDefined();
    expect(outerPressable?.props.accessibilityLabel).toBe(
      'Test Product, $9.99',
    );
  });
});
