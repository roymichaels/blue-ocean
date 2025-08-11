import { Category } from '../types';
import tonAuth from '../services/tonAuth';
import { setCategory, getCategory, listCategories, removeCategory } from '../services/tonCategories';

class CategoriesAgent {
  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage categories.');
    }
  }

  async add(item: Category): Promise<void> {
    await this.ensureWallet();
    await setCategory(item);
  }

  async update(item: Category): Promise<void> {
    await this.ensureWallet();
    await setCategory(item);
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeCategory(id);
  }

  async get(id: string): Promise<Category | null> {
    return await getCategory(id);
  }

  async getAll(): Promise<Category[]> {
    return await listCategories();
  }
}

export default new CategoriesAgent();
