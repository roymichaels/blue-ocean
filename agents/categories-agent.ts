import { Category } from '../types';
import { sendWakuCategoryUpdate } from '../lib/waku/sendWakuCategoryUpdate';
import WakuAgent from '../utils/wakuAgent';
import tonAuth from '../services/tonAuth';

// Publishes and replicates category records via Waku

class CategoriesAgent extends WakuAgent<Category> {
  constructor() {
    super(sendWakuCategoryUpdate, {
      topic: '/congress/categories/1',
      replayHistory: true,
      extractItem: (msg: any) =>
        msg.type === 'category.update' ? (msg.category as Category) : undefined,
    });
  }

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
    await super.add(item);
  }

  async update(item: Category): Promise<void> {
    await this.ensureWallet();
    await super.update(item);
  }
}

export default new CategoriesAgent();
