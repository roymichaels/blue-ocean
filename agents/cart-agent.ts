import { CartItem } from '../types';
import { sendWakuCartUpdate } from '../lib/waku/sendWakuCartUpdate';
import WakuAgent from '../utils/wakuAgent';

class CartAgent extends WakuAgent<CartItem> {
  constructor() {
    super(sendWakuCartUpdate);
  }
}

export default new CartAgent();
