import { Category } from '@/types';
import { assertNearChain } from '@/services/chain';
import {
  setCategory,
  getCategory,
  listCategories,
  removeCategory,
} from '@/features/products/services/nearCategories';
import ensureNearWallet from '@/utils/ensureNearWallet';

assertNearChain();

class CategoriesAgent {
  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to manage categories.');
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

  /**
   * Returns a defensive copy of a category by id.
   */
  async selectCategory(id: string): Promise<Category | null> {
    const cat = await getCategory(id);
    return cat ? JSON.parse(JSON.stringify(cat)) : null;
  }

  /**
   * Returns defensive copies of all categories.
   */
  async getCategories(): Promise<Category[]> {
    const list = await listCategories();
    return list.map((c) => JSON.parse(JSON.stringify(c)));
  }
}

const categoriesAgent = new CategoriesAgent();

export const getCategories = (): Promise<Category[]> =>
  categoriesAgent.getCategories();
export const selectCategory = (id: string): Promise<Category | null> =>
  categoriesAgent.selectCategory(id);

export default categoriesAgent;
