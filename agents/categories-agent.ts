import { Category } from '../types';
import { sendWakuCategoryUpdate } from '../lib/waku/sendWakuCategoryUpdate';
import WakuAgent from '../utils/wakuAgent';

class CategoriesAgent extends WakuAgent<Category> {
  constructor() {
    super(sendWakuCategoryUpdate);
  }
}

export default new CategoriesAgent();
