import DatabaseService from '../services/database';
import { executeSql } from '../lib/sqlite';

jest.mock('../lib/sqlite', () => ({
  executeSql: jest.fn(),
}));

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
    (executeSql as jest.Mock).mockResolvedValue({
      rows: {
        _array: [
          {
            id: '1',
            name: 'Product',
            name_en: 'Product EN',
            name_he: 'Product HE',
            price: 10,
            originalPrice: null,
            description: 'desc',
            description_en: 'desc',
            description_he: 'desc',
            category: 'cat',
            subcategory: null,
            images: '["img1"]',
            videos: '["vid1"]',
            colors: '["red"]',
            rating: 4,
            reviews: 2,
            badges: '["sale"]',
            pricing_tier: 'tier1',
            mix_group_id: 'mix1',
            stock: 5,
            created_at: 'c',
            updated_at: 'u',
          },
        ],
      },
    });

    const service = DatabaseService.getInstance();
    const product = await service.getProduct('1');

    expect(product).toEqual({
      id: '1',
      name: 'Product',
      name_en: 'Product EN',
      name_he: 'Product HE',
      price: 10,
      originalPrice: undefined,
      description: 'desc',
      description_en: 'desc',
      description_he: 'desc',
      category: 'cat',
      subcategory: undefined,
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
