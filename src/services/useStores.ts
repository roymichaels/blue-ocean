import { useQuery } from '@tanstack/react-query';
import chain from '@services/chain';
import { Store } from '@/types';

let listStores: ((storeId: string) => Promise<Store[]>) | undefined;
if (chain === 'near') {
  ({ listStores } = require('@features/stores/services/nearStores'));
}

export function useStores(storeId: string) {
  return useQuery({
    queryKey: ['stores', storeId],
    queryFn: () => (listStores ? listStores(storeId) : Promise.resolve([])),
    select: (data) => data ?? [],
  });
}
