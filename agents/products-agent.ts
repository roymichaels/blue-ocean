import { Product } from '../types';
import tonAuth from '../services/tonAuth';
import { setProduct, getProduct, listProducts, removeProduct } from '../services/tonProducts';
import { getStore } from '../services/tonStores';

class ProductsAgent {
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
  }

  async update(item: Product): Promise<void> {
    await this.assertStoreOwner(item.storeId);
    await setProduct(item);
  }

  async remove(id: string): Promise<void> {
    const prod = await getProduct(id);
    if (!prod) return;
    await this.assertStoreOwner(prod.storeId);
    await removeProduct(id);
  }

  async get(id: string): Promise<Product | null> {
    return await getProduct(id);
  }

  async getAll(): Promise<Product[]> {
    return await listProducts();
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
