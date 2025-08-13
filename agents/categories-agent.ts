import { Category } from '../types';
import { setCategory, getCategory, listCategories, removeCategory } from '../services/tonCategories';
import ensureTonWallet from '../utils/ensureTonWallet';

class CategoriesAgent {
  private async ensureWallet() {
    await ensureTonWallet('Please connect your TON wallet to manage categories.');
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
