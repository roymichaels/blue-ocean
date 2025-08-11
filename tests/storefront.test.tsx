import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StorefrontScreen from '../app/storefront';

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#fff', text: { primary: '#000', secondary: '#666' } } }),
}));

jest.mock('../agents/products-agent', () => ({
  getAll: jest.fn(async () => [
    {
      id: 'p1',
      name: 'Product 1',
      storeId: 's1',
      price: 1,
      stock: 1,
      description: '',
      images: [],
      categoryId: 'c1',
      createdAt: '',
      updatedAt: '',
    } as any,
  ]),
}));

jest.mock('../agents/review-agent', () => ({
  getByProduct: jest.fn(async () => [
    { id: 'r1', productId: 'p1', userId: 'u1', rating: 4, comment: '', createdAt: '' } as any,
  ]),
}));

jest.mock('../components/ProductCard', () => ({
  __esModule: true,
  default: ({ product }: any) => React.createElement('ProductCard', null, product.name),
}));

describe('StorefrontScreen', () => {
  it('shows products with review info', async () => {
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StorefrontScreen />);
    });
    const tree = root!.toJSON();
    const str = JSON.stringify(tree);
    expect(str).toContain('Product 1');
    expect(str).toContain('⭐ 4.0 (1)');
  });
});
