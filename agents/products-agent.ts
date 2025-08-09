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

  protected async broadcast(item: Product) {
    const store = storesAgent.get(item.storeId);
    const addr = tonAuth.getAddress();
    if (!store || store.owner !== addr) {
      throw new Error('Only the store owner can broadcast product updates');
    }
    await super.broadcast(item);
  }
}

export default new ProductsAgent();
