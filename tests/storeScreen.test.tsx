import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StoreScreen from '@app/store/[storeId]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ storeId: 's1' }),
}));

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: { primary: '#000', secondary: '#666', inverse: '#fff' },
      border: { primary: '#000' },
    },
  }),
}));

jest.mock('../agents/stores-agent', () => ({
  get: jest.fn(async () => ({ id: 's1', name: 'Test Store' })),
  getReputationScore: jest.fn(() => 4.5),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
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
    } as any,
  ]),
}));

jest.mock('../agents/review-agent', () => ({
  getByProduct: jest.fn(async (id: string) => {
    if (id === 'p1') return [{ rating: 4 }, { rating: 5 }] as any;
    if (id === 'p2') return [{ rating: 3 }] as any;
    return [];
  }),
}));

jest.mock('@/features/products', () => ({
  ProductCard: ({ product }: any) => React.createElement('ProductCard', null, product.name),
}));

describe('StoreScreen', () => {
  it('shows store catalog with reviews', async () => {
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StoreScreen />);
    });
    await act(async () => {});
    const str = JSON.stringify(root!.toJSON());
    expect(str).toContain('Test Store');
    expect(str).toContain('Apple');
    expect(str).toContain('Carrot');
    expect(str).toContain('⭐ 4.5 (2)');
    expect(str).toContain('⭐ 3.0 (1)');
  });
});
