import { CartItem } from '../types';
import tonAuth from '../services/tonAuth';
import { setCartItem, getCartItem, listCartItems, removeCartItem } from '../services/tonCart';

class CartAgent {
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
    await setCartItem(item);
  }

  async update(item: CartItem): Promise<void> {
    await this.ensureWallet();
    await setCartItem(item);
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeCartItem(id);
  }

  async get(id: string): Promise<CartItem | null> {
    return await getCartItem(id);
  }

  async getAll(): Promise<CartItem[]> {
    return await listCartItems();
  }
}

export default new CartAgent();
