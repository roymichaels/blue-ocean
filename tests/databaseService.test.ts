import DatabaseService from '../services/database';
import { store } from '../lib/memoryStore';

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a singleton instance', () => {
    const first = DatabaseService.getInstance();
    const second = DatabaseService.getInstance();
    expect(first).toBe(second);
  });

  it('maps getProduct response correctly', async () => {
    store.products.set('1', {
      id: '1',
      name: 'Product',
      name_en: 'Product EN',
      name_he: 'Product HE',
      price: 10,
      description: 'desc',
      description_en: 'desc',
      description_he: 'desc',
      category: 'cat',
      images: ['img1'],
      videos: ['vid1'],
      colors: ['red'],
      rating: 4,
      reviews: 2,
      badges: ['sale'],
      pricingTier: 'tier1',
      mixGroupId: 'mix1',
      stock: 5,
      createdAt: 'c',
      updatedAt: 'u',
      tenant_id: 'thecongress',
    });

    const service = DatabaseService.getInstance();
    const product = await service.getProduct('1');

    expect(product).toEqual({
      id: '1',
      name: 'Product',
      name_en: 'Product EN',
      name_he: 'Product HE',
      price: 10,
      description: 'desc',
      description_en: 'desc',
      description_he: 'desc',
      category: 'cat',
      tenant_id: 'thecongress',
      images: ['img1'],
      videos: ['vid1'],
      colors: ['red'],
      rating: 4,
      reviews: 2,
      badges: ['sale'],
      pricingTier: 'tier1',
      mixGroupId: 'mix1',
      stock: 5,
      createdAt: 'c',
      updatedAt: 'u',
    });
  });
});
