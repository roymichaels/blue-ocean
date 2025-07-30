import { CartItem } from '../types';
import { sendWakuCartUpdate } from '../lib/waku/sendWakuCartUpdate';
import WakuAgent from '../utils/wakuAgent';

class CartAgent extends WakuAgent<CartItem> {
  constructor() {
    super(sendWakuCartUpdate, {
      topic: '/congress/cart/1',
      replayHistory: true,
      extractItem: (msg: any) =>
        msg.type === 'cart.update' ? (msg.cartItem as CartItem) : undefined,
    });
  }
}

export default new CartAgent();
