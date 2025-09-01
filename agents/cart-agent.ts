import { CartItem } from '../types';
import { assertTonChain } from '../services/chain';
import { setCartItem, getCartItem, listCartItems, removeCartItem } from '@/features/cart/services/tonCart';
import ensureTonWallet from '../utils/ensureTonWallet';

assertTonChain();

class CartAgent {
  private async ensureWallet() {
    await ensureTonWallet('Please connect your TON wallet to manage your cart.');
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
