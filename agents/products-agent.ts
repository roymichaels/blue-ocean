import { Product } from '../types';
import { sendWakuProductUpdate } from '../lib/waku/sendWakuProductUpdate';
import WakuAgent from '../utils/wakuAgent';
import storesAgent from './stores-agent';
import tonAuth from '../services/tonAuth';

class ProductsAgent extends WakuAgent<Product> {
  constructor() {
    super(sendWakuProductUpdate, {
      topic: '/congress/products/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.product as Product,
      validateMessage: async (msg: any) => {
        const storeId = msg.product?.storeId;
        const senderAddr = msg.sender?.address;
        if (!storeId || !senderAddr) return false;
        const store = storesAgent.get(storeId);
        return store?.owner === senderAddr;
      },
    });
  }

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage products.');
    }
    return { address };
  }

  async add(item: Product): Promise<void> {
    await this.ensureWallet();
    await super.add(item);
  }

  async update(item: Product): Promise<void> {
    await this.ensureWallet();
    await super.update(item);
  }

  protected async broadcast(item: Product) {
    const { address } = await this.ensureWallet();
    const store = storesAgent.get(item.storeId);
    if (!store || store.owner !== address) {
      throw new Error('Only the store owner can broadcast product updates');
    }
    await super.broadcast(item);
  }
}

export default new ProductsAgent();
