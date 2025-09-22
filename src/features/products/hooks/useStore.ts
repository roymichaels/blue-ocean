import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Store } from '@/types';
import storeRepository, { type StoreRepositoryDiff } from '@/services/storeRepository';

let getStore: ((storeId: string, id: string) => Promise<Store | null>) | undefined;
if (chain === 'near') {
  const nearStores = require('@/features/stores/services/nearStores');
  const service = nearStores.createStoreService(
    nearStores.createDefaultStoreServiceDeps(),
  );
  getStore = service.selectStore;
}

export function useStore(id?: string, storeId: string = 'default') {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;
    if (!storeRepository || typeof storeRepository.on !== 'function') return;
    const updateQuery = (ns: string, value: Store | null) => {
      queryClient.setQueryData(['store', ns, id], value);
    };
    const unsubscribe = storeRepository.on('store.diff', (change: StoreRepositoryDiff) => {
      if (change.id !== id) return;
      if (change.op === 'remove') {
        updateQuery(change.namespace, null);
        updateQuery('default', null);
        updateQuery(storeId, null);
        return;
      }
      updateQuery(change.namespace, change.store);
      updateQuery('default', change.store);
      updateQuery(storeId, change.store);
    });
    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, [id, storeId, queryClient]);

  return useQuery({
    queryKey: ['store', storeId, id],
    queryFn: () => (getStore && id ? getStore(storeId, id) : Promise.resolve(null)),
    enabled: !!id && !!getStore,
    staleTime: 5 * 60 * 1000,
  });
}
