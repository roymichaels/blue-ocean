import { Product } from '../types';
import { sendWakuProductUpdate } from '../lib/waku/sendWakuProductUpdate';
import WakuAgent from '../utils/wakuAgent';

class ProductsAgent extends WakuAgent<Product> {
  constructor() {
    super(sendWakuProductUpdate, {
      topic: '/congress/products/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.product as Product,
      allowedRoles: ['admin'],
    });
  }
}

export default new ProductsAgent();
