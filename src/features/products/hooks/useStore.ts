import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Store } from '@/types';

let getStore: ((storeId: string, id: string) => Promise<Store | null>) | undefined;
if (chain === 'near') {
  const nearStores = require('@/features/stores/services/nearStores');
  const service = nearStores.createStoreService(
    nearStores.createDefaultStoreServiceDeps(),
  );
  getStore = service.selectStore;
}

export function useStore(id?: string, storeId: string = 'default') {
  return useQuery({
    queryKey: ['store', storeId, id],
    queryFn: () => (getStore && id ? getStore(storeId, id) : Promise.resolve(null)),
    enabled: !!id && !!getStore,
    staleTime: 5 * 60 * 1000,
  });
}
