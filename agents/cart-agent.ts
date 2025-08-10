import { CartItem } from '../types';
import { sendWakuCartUpdate } from '../lib/waku/sendWakuCartUpdate';
import WakuAgent from '../utils/wakuAgent';
import tonAuth from '../services/tonAuth';

// Publishes and replicates cart items via Waku

class CartAgent extends WakuAgent<CartItem> {
  constructor() {
    super(sendWakuCartUpdate, {
      topic: '/congress/cart/1',
      replayHistory: true,
      extractItem: (msg: any) =>
        msg.type === 'cart.update' ? (msg.cartItem as CartItem) : undefined,
    });
  }

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage your cart.');
    }
  }

  async add(item: CartItem): Promise<void> {
    await this.ensureWallet();
    await super.add(item);
  }

  async update(item: CartItem): Promise<void> {
    await this.ensureWallet();
    await super.update(item);
  }
}

export default new CartAgent();
