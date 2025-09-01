import { getValue, setValue, listValues, removeValue } from '@/services/nearKvStore';
import { CartItem } from '@/types';
import { requireEnv } from '@/utils/appConfig';
import { assertNearChain } from '@/services/chain';

assertNearChain();

const CHAIN = (process.env.EXPO_PUBLIC_CHAIN || '').toLowerCase();
const ADDRESS = CHAIN === 'near' ? requireEnv('NEAR_CART_CONTRACT') : 'near:disabled';

export async function getCartItem(id: string): Promise<CartItem | null> {
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as CartItem) : null;
}

export async function setCartItem(item: CartItem) {
  await setValue(ADDRESS, item.id, JSON.stringify(item));
}

export async function removeCartItem(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listCartItems(): Promise<CartItem[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as CartItem);
}
