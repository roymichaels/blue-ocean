import { Product } from '../types';
import { sendWakuProductUpdate } from '../lib/waku/sendWakuProductUpdate';
import WakuAgent from '../utils/wakuAgent';

class ProductsAgent extends WakuAgent<Product> {
  constructor() {
    super(sendWakuProductUpdate);
  }
}

export default new ProductsAgent();
