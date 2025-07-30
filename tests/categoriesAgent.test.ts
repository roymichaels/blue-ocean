import categoriesAgent from '../agents/categories-agent';
import DatabaseService from '../services/database';

jest.mock('../lib/waku/sendWakuCategoryUpdate', () => ({
  sendWakuCategoryUpdate: jest.fn(),
}));

describe('CategoriesAgent integration', () => {
  beforeEach(() => {
    (categoriesAgent as any).store.clear();
    (DatabaseService as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('DatabaseService returns replicated categories', async () => {
    const category = { id: '1', name: 'Test', subcategories: [] } as any;
    await categoriesAgent.add(category);
    const db = DatabaseService.getInstance();
    const categories = await db.getCategories();
    expect(categories).toEqual([category]);
  });
});
