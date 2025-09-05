import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ProductGrid from '@features/home/components/ProductGrid';
import { CategoryButton, BannerItem } from '@app/landing';
import { Product, Category, HeroBanner } from '@/types';

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

let buttonRender = 0;
jest.mock('@/ui/primitives/Button', () => (props: any) => {
  buttonRender++;
  return React.createElement('view', props);
});

let smartImageRender = 0;
jest.mock('@app/components/SmartImage', () => (props: any) => {
  smartImageRender++;
  return React.createElement('view', props);
});

describe('memoization', () => {
  beforeEach(() => {
    productCardRender = 0;
    buttonRender = 0;
    smartImageRender = 0;
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
    const categories: Category[] = [];
    const props = {
      products: [product],
      categories,
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

  it('category', () => {
    const category: Category = { id: '1', name: 'Cat', icon: '' };
    const colors = {
      border: { primary: 'red' },
      surface: { primary: 'blue' },
      text: { primary: 'green', secondary: 'gray' },
      gold: 'pink',
    };
    const onPress = () => {};
    const component = renderer.create(
      <CategoryButton category={category} onPress={() => onPress()} colors={colors} />
    );
    act(() => {
      component.update(
        <CategoryButton category={category} onPress={() => onPress()} colors={colors} />
      );
    });
    expect(buttonRender).toBe(1);
  });

  it('banner', () => {
    const banner: HeroBanner = {
      id: 'b1',
      image: 'img.png',
      title: 't',
      subtitle: 's',
    };
    const colors = {
      border: { primary: 'red' },
      surface: { primary: 'blue' },
      text: { primary: 'green', secondary: 'gray' },
      gold: 'pink',
    };
    const component = renderer.create(<BannerItem banner={banner} colors={colors} />);
    act(() => {
      component.update(<BannerItem banner={banner} colors={colors} />);
    });
    expect(smartImageRender).toBe(1);
  });
});
