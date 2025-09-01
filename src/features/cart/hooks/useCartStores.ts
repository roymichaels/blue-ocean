import React from 'react';
import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { CartItem, Store } from '@/types';

let getStore: ((storeId: string, id: string) => Promise<Store | null>) | undefined;
if (chain === 'near') {
  ({ getStore } = require('@/features/stores/services/nearStores'));
}

export default function useCartStores(cartItems: CartItem[]) {
  const ids = React.useMemo(
    () => Array.from(new Set(cartItems.map((i) => i.product.storeId))),
    [cartItems],
  );

  const { data: stores = {} } = useQuery({
    queryKey: ['cart-stores', ids],
    queryFn: async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          const store = getStore ? await getStore(id, id) : null;
          return store ? ([id, store] as const) : null;
        }),
      );
      const map: Record<string, Store> = {};
      entries.forEach((entry) => {
        if (entry) map[entry[0]] = entry[1];
      });
      return map;
    },
    suspense: true,
  });

  return stores;
}
