// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { Order } from '@/types';
import { notImplemented } from '@/services/nearStub';

export const ordersWarmCache: any = {
  getById: (..._args: any[]) => notImplemented('ordersWarmCache.getById'),
  list: (..._args: any[]) => notImplemented('ordersWarmCache.list'),
  subscribe: (..._args: any[]) => notImplemented('ordersWarmCache.subscribe'),
  mutate: (..._args: any[]) => notImplemented('ordersWarmCache.mutate'),
  onSynced: (..._args: any[]) => notImplemented('ordersWarmCache.onSynced'),
};

export async function getOrder(_storeId: string, _id: string): Promise<Order | null> {
  return notImplemented('getOrder');
}

export async function setOrder(_storeId: string, _order: Order): Promise<void> {
  return notImplemented('setOrder');
}

export async function removeOrder(_storeId: string, _id: string): Promise<void> {
  return notImplemented('removeOrder');
}

export async function listOrders(_storeId: string): Promise<Order[]> {
  return notImplemented('listOrders');
}

export async function listOrdersBySeller(
  _storeId: string,
  _sellerAddress: string,
): Promise<Order[]> {
  return notImplemented('listOrdersBySeller');
}

export async function listOrdersByBuyer(_buyerAddress: string): Promise<Order[]> {
  return notImplemented('listOrdersByBuyer');
}

export { E_STALE_DATA, E_SYNC_LAG } from '@/schemas/cache';
