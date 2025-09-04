import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StorefrontScreen from '@app/storefront';

jest.mock('@/ui/ThemeProvider', () => ({
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

jest.mock('@/features/products/ProductCard', () => ({
  __esModule: true,
  default: ({ product }: any) => React.createElement('ProductCard', null, product.name),
}));

describe('StorefrontScreen', () => {
  it('filters products by search, category and tags', async () => {
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StorefrontScreen />);
    });

    const searchInput = root!.root.findByProps({ testID: 'search-input' });
    await act(async () => {
      searchInput.props.onChangeText('Apple');
    });
    let tree = root!.toJSON();
    let str = JSON.stringify(tree);
    expect(str).toContain('Apple');
    expect(str).not.toContain('Carrot');

    const categoryChip = root!.root.findByProps({ testID: 'category-vegetables' });
    await act(async () => {
      categoryChip.props.onPress();
    });
    tree = root!.toJSON();
    str = JSON.stringify(tree);
    expect(str).toContain('Carrot');
    expect(str).not.toContain('Apple');

    const tagChip = root!.root.findByProps({ testID: 'tag-root' });
    await act(async () => {
      tagChip.props.onPress();
    });
    tree = root!.toJSON();
    str = JSON.stringify(tree);
    expect(str).toContain('Carrot');
    expect(str).not.toContain('Apple');
  });
});
