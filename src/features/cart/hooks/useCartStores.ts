import { useEffect, useState } from 'react';
import chain from '@/services/chain';
import { CartItem, Store } from '@/types';

let getStore: ((storeId: string, id: string) => Promise<Store | null>) | undefined;
if (chain === 'ton') {
  ({ getStore } = require('@/services/tonStores'));
}

export default function useCartStores(cartItems: CartItem[]) {
  const [stores, setStores] = useState<Record<string, Store>>({});

  useEffect(() => {
    const fetchStores = async () => {
      const ids = Array.from(new Set(cartItems.map((i) => i.product.storeId)));
      const entries = await Promise.all(
        ids.map(async (id) => {
          const store = getStore ? await getStore(id, id) : null;
          return store ? ([id, store] as const) : null;
        })
      );
      const map: Record<string, Store> = {};
      entries.forEach((entry) => {
        if (entry) map[entry[0]] = entry[1];
      });
      setStores(map);
    };
    fetchStores();
  }, [cartItems]);

  return stores;
}
