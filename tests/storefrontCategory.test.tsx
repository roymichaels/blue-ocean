import React from 'react';
import renderer, { act } from 'react-test-renderer';
import CategoryScreen from '../app/storefront/category/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'vegetables' }),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: { primary: '#000', secondary: '#666', inverse: '#fff' },
      border: { primary: '#000' },
      gold: '#ff0',
    },
  }),
}));

jest.mock('../agents/products-agent', () => ({
  getAll: jest.fn(async () => [
    {
      id: 'p1',
      name: 'Apple',
      storeId: 's1',
      price: 1,
      stock: 1,
      description: '',
      images: [],
      category: 'fruits',
      badges: ['fresh'],
    } as any,
    {
      id: 'p2',
      name: 'Carrot',
      storeId: 's1',
      price: 1,
      stock: 1,
      description: '',
      images: [],
      category: 'vegetables',
      badges: ['root'],
    } as any,
  ]),
}));

jest.mock('../agents/review-agent', () => ({
  getByProduct: jest.fn(async () => []),
}));

jest.mock('@features/products/ProductCard', () => ({
  __esModule: true,
  default: ({ product }: any) => React.createElement('ProductCard', null, product.name),
}));

describe('CategoryScreen', () => {
  it('shows products for selected category', async () => {
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<CategoryScreen />);
    });
    const str = JSON.stringify(root!.toJSON());
    expect(str).toContain('Carrot');
    expect(str).not.toContain('Apple');
  });
});
