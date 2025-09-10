import { Category } from '@/types';
import { assertNearChain } from '@/services/chain';
import {
  setCategory,
  getCategory,
  listCategories,
  removeCategory,
} from '@/features/products/services/nearCategories';
import ensureNearWallet from '@/utils/ensureNearWallet';
import { normalizeMessage } from '../lib/normalizeMessage';

assertNearChain();

class CategoriesAgent {
  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to manage categories.');
  }

  async add(storeId: string, item: Category): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Category>('Category', item);
    await setCategory(storeId, normalized);
  }

  async update(storeId: string, item: Category): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Category>('Category', item);
    await setCategory(storeId, normalized);
  }

  async remove(storeId: string, id: string): Promise<void> {
    await this.ensureWallet();
    await removeCategory(storeId, id);
  }

  /**
   * Returns a defensive copy of a category by id.
   */
  async selectCategory(storeId: string, id: string): Promise<Category | null> {
    const cat = await getCategory(storeId, id);
    return cat ? JSON.parse(JSON.stringify(cat)) : null;
  }

  /**
   * Returns defensive copies of all categories.
   */
  async getCategories(storeId: string): Promise<Category[]> {
    const list = await listCategories(storeId);
    return list.map((c) => JSON.parse(JSON.stringify(c)));
  }
}

const categoriesAgent = new CategoriesAgent();

export const getCategories = (storeId: string): Promise<Category[]> =>
  categoriesAgent.getCategories(storeId);
export const selectCategory = (storeId: string, id: string): Promise<Category | null> =>
  categoriesAgent.selectCategory(storeId, id);

export default categoriesAgent;
