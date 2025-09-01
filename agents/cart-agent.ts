import { CartItem } from '../types';
import { assertNearChain } from '../services/chain';
import {
  setCartItem,
  getCartItem,
  listCartItems,
  removeCartItem,
} from '@/features/cart/services/nearCart';
import ensureNearWallet from '../utils/ensureNearWallet';
import { normalizeMessage } from '../lib/normalizeMessage';

assertNearChain();

class CartAgent {
  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to manage your cart.');
  }

  async add(item: CartItem): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<CartItem>('CartItem', item);
    await setCartItem(normalized);
  }

  async update(item: CartItem): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<CartItem>('CartItem', item);
    await setCartItem(normalized);
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
