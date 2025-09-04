import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Order } from '@/types';

let listOrders: ((storeId: string) => Promise<Order[]>) | undefined;
let setOrder: ((storeId: string, order: Order) => Promise<void>) | undefined;
let removeOrder: ((storeId: string, id: string) => Promise<void>) | undefined;
if (chain === 'near') {
  ({ listOrders, setOrder, removeOrder } = require('@/services/nearOrders'));
}

export function useOrders(storeId: string) {
  return useQuery({
    queryKey: ['orders', storeId],
    queryFn: () => (listOrders ? listOrders(storeId) : Promise.resolve([])),
    select: (data) => data ?? [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useOrderMutations(storeId: string) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (order: Order) =>
      setOrder ? setOrder(storeId, order) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      removeOrder ? removeOrder(storeId, id) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] });
    },
  });

  return {
    setOrder: upsert.mutateAsync,
    removeOrder: remove.mutateAsync,
    isPending: upsert.isPending || remove.isPending,
  };
}
