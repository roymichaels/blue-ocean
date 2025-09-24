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

// TODO:TODO-113 Expand CategoriesAgent to coordinate cross-channel taxonomy sync when stores sell in multiple marketplaces.
// TODO:REC-213 Share wallet guard copy through localization dictionaries to keep admin prompts consistent.
class CategoriesAgent {
  private static clone(category: Category): Category {
    return JSON.parse(JSON.stringify(category));
  }

  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to manage categories.');
  }

  private async write(storeId: string, item: Category): Promise<void> {
    await this.ensureWallet();
    await setCategory(storeId, normalizeMessage<Category>('Category', item));
  }

  async add(storeId: string, item: Category): Promise<void> {
    await this.write(storeId, item);
  }

  async update(storeId: string, item: Category): Promise<void> {
    await this.write(storeId, item);
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
    return cat ? CategoriesAgent.clone(cat) : null;
  }

  /**
   * Returns defensive copies of all categories.
   */
  async getCategories(storeId: string): Promise<Category[]> {
    const list = await listCategories(storeId);
    return list.map(CategoriesAgent.clone);
  }
}

const categoriesAgent = new CategoriesAgent();

export const getCategories = (storeId: string): Promise<Category[]> =>
  categoriesAgent.getCategories(storeId);
export const selectCategory = (storeId: string, id: string): Promise<Category | null> =>
  categoriesAgent.selectCategory(storeId, id);

export default categoriesAgent;
