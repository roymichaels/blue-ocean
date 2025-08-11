import { Product } from '../types';
import tonAuth from '../services/tonAuth';
import {
  setProduct,
  getProduct,
  listProducts,
  removeProduct,
} from '../services/tonProducts';
import { getStore } from '../services/tonStores';

interface ProductSummary {
  rating: number;
  reviews: number;
}

class ProductsAgent {
  private cache: Map<string, Product> = new Map();
  private summaries: Map<string, ProductSummary> = new Map();

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage products.');
    }
    return { address };
  }

  private async assertStoreOwner(storeId: string) {
    const { address } = await this.ensureWallet();
    const store = await getStore(storeId);
    if (!store || store.owner !== address) {
      throw new Error('Only the store owner can manage products');
    }
  }

  async add(item: Product): Promise<void> {
    await this.assertStoreOwner(item.storeId);
    await setProduct(item);
    this.cache.set(item.id, item);
    this.summaries.set(item.id, { rating: item.rating, reviews: item.reviews });
  }

  async update(item: Product): Promise<void> {
    await this.assertStoreOwner(item.storeId);
    await setProduct(item);
    this.cache.set(item.id, item);
    this.summaries.set(item.id, { rating: item.rating, reviews: item.reviews });
  }

  async remove(id: string): Promise<void> {
    const prod = await getProduct(id);
    if (!prod) return;
    await this.assertStoreOwner(prod.storeId);
    await removeProduct(id);
    this.cache.delete(id);
    this.summaries.delete(id);
  }

  async get(id: string): Promise<Product | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const prod = await getProduct(id);
    if (prod) {
      this.cache.set(id, prod);
      this.summaries.set(id, { rating: prod.rating, reviews: prod.reviews });
    }
    return prod;
  }

  async getAll(): Promise<Product[]> {
    if (this.cache.size > 0) return Array.from(this.cache.values());
    const prods = await listProducts();
    prods.forEach((p) => {
      this.cache.set(p.id, p);
      this.summaries.set(p.id, { rating: p.rating, reviews: p.reviews });
    });
    return prods;
  }

  async getSummary(id: string): Promise<ProductSummary> {
    const cached = this.summaries.get(id);
    if (cached) return cached;
    const prod = await this.get(id);
    return prod ? { rating: prod.rating, reviews: prod.reviews } : { rating: 0, reviews: 0 };
  }

  async decrementStock(productId: string, quantity: number): Promise<void> {
    const prod = await getProduct(productId);
    if (!prod) return;
    await this.assertStoreOwner(prod.storeId);
    const newStock = Math.max((prod.stock || 0) - quantity, 0);
    await setProduct({ ...prod, stock: newStock });
  }
}

export default new ProductsAgent();
