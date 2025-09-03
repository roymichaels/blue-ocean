import DatabaseService from '../services/database';
import productsAgent from '../agents/products-agent';
import categoriesAgent from '../agents/categories-agent';
import storesAgent from '../agents/stores-agent';
import nearAuth from '@features/auth/services/nearAuth';

beforeEach(() => {
  (DatabaseService as any).instance = undefined;
  (productsAgent as any).store.clear();
  (categoriesAgent as any).store.clear();
  (nearAuth as any).getAccountId = () => 'owner1';
  (productsAgent as any).sendFn = async () => {};
  (productsAgent as any).clearHashCache();
});

describe('DatabaseService basic operations', () => {
  it('handles product lifecycle', async () => {
    const db = DatabaseService.getInstance();
    await storesAgent.add({ id: 'store1', name: 'Store', owner: 'owner1', nftId: 'nft1' });
    const prodId = await db.addProduct({
      name: 'Test',
      price: 1,
      description: 'd',
      category: 'c1',
      images: [],
      rating: 0,
      reviews: 0,
      stock: 1,
      storeId: 'store1',
    });
    const product = await db.getProduct(prodId);
    expect(product?.name).toBe('Test');
    await db.updateProduct(prodId, { price: 2 });
    expect((await db.getProduct(prodId))?.price).toBe(2);
    await db.deleteProduct(prodId);
    expect(await db.getProduct(prodId)).toBeNull();
  });

  it('manages subcategories within categories', async () => {
    const db = DatabaseService.getInstance();
    await db.addCategory({ id: 'c1', name: 'Cat', icon: '📦', subcategories: [] });
    await db.addSubcategory({ id: 's1', name: 'Sub', icon: '🧩', categoryId: 'c1' });
    let cats = await db.getCategories();
    expect(cats[0].subcategories?.length).toBe(1);
    await db.deleteSubcategory('s1');
    cats = await db.getCategories();
    expect(cats[0].subcategories?.length).toBe(0);
  });

  it('stores wishlist items per user', async () => {
    const db = DatabaseService.getInstance();
    await storesAgent.add({ id: 'store1', name: 'Store', owner: 'owner1', nftId: 'nft1' });
    const id = await db.addProduct({
      name: 'Wish',
      price: 5,
      description: 'w',
      category: 'c1',
      images: [],
      rating: 0,
      reviews: 0,
      stock: 1,
      storeId: 'store1',
    });
    await db.addWishlistItem('u1', id);
    expect((await db.getWishlistItems('u1')).length).toBe(1);
    await db.removeWishlistItem('u1', id);
    expect((await db.getWishlistItems('u1')).length).toBe(0);
  });
});

