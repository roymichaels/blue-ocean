import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { CartItem } from '../types';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_CART_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

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
