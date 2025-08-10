import { Store } from '../types';
import { sendWakuStoreUpdate } from '../lib/waku/sendWakuStoreUpdate';
import WakuAgent from '../utils/wakuAgent';
import tonAuth from '../services/tonAuth';

class StoresAgent extends WakuAgent<Store> {
  constructor() {
    super(sendWakuStoreUpdate, {
      topic: '/congress/stores/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.store as Store,
    });
  }

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage stores.');
    }
  }

  async add(item: Store): Promise<void> {
    await this.ensureWallet();
    await super.add(item);
  }

  async update(item: Store): Promise<void> {
    await this.ensureWallet();
    await super.update(item);
  }
}

export default new StoresAgent();
