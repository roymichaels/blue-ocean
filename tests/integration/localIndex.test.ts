import { LocalIndex } from '@/services/localIndex';
import type { Product } from '@/types';
import { normalizeHebrew } from '@/utils/strings';

describe('normalizeHebrew', () => {
  it('removes niqqud characters while preserving base letters', () => {
    expect(normalizeHebrew('חָלָב')).toBe('חלב');
  });

  it('returns the original string when no niqqud characters are present', () => {
    expect(normalizeHebrew('שוקו')).toBe('שוקו');
  });
});

const createProduct = (overrides: Partial<Product> = {}): Product => ({
  id: overrides.id ?? 'product-1',
  name: overrides.name ?? 'Product',
  price: overrides.price ?? 10,
  description: overrides.description ?? 'תיאור מוצר',
  category: overrides.category ?? 'קטגוריה',
  images: overrides.images ?? [],
  rating: overrides.rating ?? 0,
  reviews: overrides.reviews ?? 0,
  storeId: overrides.storeId ?? 'store-1',
  stock: overrides.stock ?? 1,
  name_en: overrides.name_en,
  name_he: overrides.name_he,
  description_en: overrides.description_en,
  description_he: overrides.description_he,
  originalPrice: overrides.originalPrice,
  subcategory: overrides.subcategory,
  videos: overrides.videos,
  colors: overrides.colors,
  variants: overrides.variants,
  badges: overrides.badges,
  pricingTier: overrides.pricingTier,
  mixGroupId: overrides.mixGroupId,
  createdAt: overrides.createdAt,
  updatedAt: overrides.updatedAt,
});

describe('LocalIndex query normalization', () => {
  it('matches products whose stored values contain niqqud when the query does not', async () => {
    const index = new LocalIndex();
    const product = createProduct({
      id: 'milk',
      name: 'חָלָב טרי',
      description: 'חלב באיכות גבוהה',
      category: 'מוצרי חלב',
    });

    index.setProducts([product]);

    const result = await index.query('חלב טרי');

    expect(result.products).toEqual([product]);
    expect(result.total).toBe(1);
  });

  it('matches products when the query includes niqqud but the stored values do not', async () => {
    const index = new LocalIndex();
    const product = createProduct({
      id: 'bread',
      name: 'לחם טרי',
      description: 'לחם חם מהתנור',
      category: 'מאפים',
    });

    index.setProducts([product]);

    const result = await index.query('לֶחֶם טרי');

    expect(result.products).toEqual([product]);
    expect(result.total).toBe(1);
  });
});
