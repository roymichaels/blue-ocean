// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { CartItem } from '@/types';
import { notImplemented } from '@/services/nearStub';

export async function getCartItem(_id: string): Promise<CartItem | null> {
  return notImplemented('getCartItem');
}

export async function setCartItem(_item: CartItem): Promise<void> {
  return notImplemented('setCartItem');
}

export async function removeCartItem(_id: string): Promise<void> {
  return notImplemented('removeCartItem');
}

export async function listCartItems(): Promise<CartItem[]> {
  return notImplemented('listCartItems');
}
