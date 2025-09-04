import { CartItem } from '../types';
import { assertNearChain } from '@/services/chain';
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

  /**
   * Returns a defensive copy of a cart item by id.
   */
  async selectCartItem(id: string): Promise<CartItem | null> {
    const item = await getCartItem(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  /**
   * Returns defensive copies of all cart items.
   */
  async getCartItems(): Promise<CartItem[]> {
    const list = await listCartItems();
    return list.map((c) => JSON.parse(JSON.stringify(c)));
  }
}

const cartAgent = new CartAgent();

export const getCartItems = (): Promise<CartItem[]> => cartAgent.getCartItems();
export const selectCartItem = (id: string): Promise<CartItem | null> =>
  cartAgent.selectCartItem(id);

export default cartAgent;
