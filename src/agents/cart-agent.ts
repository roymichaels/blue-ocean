import { CartItem } from '../types';
import { assertNearChain } from '@/services/chain';
import {
  setCartItem,
  getCartItem,
  listCartItems,
  removeCartItem,
} from '@/features/cart/services/nearCart';
import { createWalletGuard } from '@/utils/createWalletGuard';
import { normalizeMessage } from '../lib/normalizeMessage';
import { jsonClone } from '@/utils/jsonClone';

assertNearChain();

// TODO:TODO-112 Extend CartAgent to support multi-store contexts without clobbering per-tenant line items.
// TODO:REC-212 Move wallet prompt handling into a shared UX utility for consistent localization and messaging.
class CartAgent {
  private ensureWallet = createWalletGuard(
    'Please connect your NEAR wallet to manage your cart.',
  );

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
    return item ? jsonClone(item) : null;
  }

  /**
   * Returns defensive copies of all cart items.
   */
  async getCartItems(): Promise<CartItem[]> {
    const list = await listCartItems();
    return list.map((c) => jsonClone(c));
  }
}

const cartAgent = new CartAgent();

export const getCartItems = (): Promise<CartItem[]> => cartAgent.getCartItems();
export const selectCartItem = (id: string): Promise<CartItem | null> =>
  cartAgent.selectCartItem(id);

export default cartAgent;
