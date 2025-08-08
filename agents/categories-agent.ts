import { Category } from '../types';
import { sendWakuCategoryUpdate } from '../lib/waku/sendWakuCategoryUpdate';
import WakuAgent from '../utils/wakuAgent';

// Publishes and replicates category records via Waku

class CategoriesAgent extends WakuAgent<Category> {
  constructor() {
    super(sendWakuCategoryUpdate, {
      topic: '/congress/categories/1',
      replayHistory: true,
      extractItem: (msg: any) =>
        msg.type === 'category.update' ? (msg.category as Category) : undefined,
      validateMessage: (msg: any) => msg.sender.role === 'admin',
    });
  }
}

export default new CategoriesAgent();
