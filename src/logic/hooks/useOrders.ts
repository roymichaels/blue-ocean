import { useCommerceResource } from './useCommerceResource';
import type { Order } from '@/data/commerce';

export function useOrders() {
  return useCommerceResource<Order[]>((client) => client.getOrders());
}
