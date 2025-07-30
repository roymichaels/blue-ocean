import { Category } from '../types';
import { sendWakuCategoryUpdate } from '../lib/waku/sendWakuCategoryUpdate';
import WakuAgent from '../utils/wakuAgent';

class CategoriesAgent extends WakuAgent<Category> {
  constructor() {
    super(sendWakuCategoryUpdate, {
      topic: '/congress/categories/1',
      replayHistory: true,
      extractItem: (msg: any) =>
        msg.type === 'category.update' ? (msg.category as Category) : undefined,
    });
  }
}

export default new CategoriesAgent();
