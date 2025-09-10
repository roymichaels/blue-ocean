import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ProductGrid from '@features/home/components/ProductGrid';
import { Product } from '@/types';

jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => ({ t: (s: string) => s }),
  useTheme: () => ({
    colors: {
      border: { primary: 'red' },
      surface: { primary: 'blue' },
      text: { primary: 'green', secondary: 'gray' },
      gold: 'pink',
    },
  }),
}));

let productCardRender = 0;
jest.mock('@features/products', () => ({
  ProductCard: (props: any) => {
    productCardRender++;
    return React.createElement('view', props);
  },
  ProductCardSkeleton: () => null,
}));

describe('memoization', () => {
  beforeEach(() => {
    productCardRender = 0;
  });

  it('grid', () => {
    const product: Product = {
      id: '1',
      name: 'Prod',
      price: 1,
      description: 'desc',
      category: 'cat',
      images: [],
      rating: 0,
      reviews: 0,
      storeId: 's',
      stock: 1,
    };
    const props = {
      products: [product],
      isStoreOwner: false,
      onEdit: () => {},
      getItemWidth: () => '50%',
      searchQuery: '',
      onAddProduct: () => {},
      loading: false,
    };
    const component = renderer.create(<ProductGrid {...props} />);
    act(() => {
      component.update(<ProductGrid {...props} />);
    });
    expect(productCardRender).toBe(1);
  });

});
