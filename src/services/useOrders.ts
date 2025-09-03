import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Order } from '@/types';

let listOrders: ((storeId: string) => Promise<Order[]>) | undefined;
if (chain === 'near') {
  ({ listOrders } = require('@/services/nearOrders'));
}

export function useOrders(storeId: string) {
  return useQuery({
    queryKey: ['orders', storeId],
    queryFn: () => (listOrders ? listOrders(storeId) : Promise.resolve([])),
    select: (data) => data ?? [],
  });
}
