import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Store } from '@/types';

let listStores: ((storeId: string) => Promise<Store[]>) | undefined;
let setStore: ((storeId: string, store: Store) => Promise<void>) | undefined;
let removeStore: ((storeId: string, id: string) => Promise<void>) | undefined;
if (chain === 'near') {
  const nearStores = require('@/features/stores/services/nearStores');
  const storeService = nearStores.createStoreService(
    nearStores.createDefaultStoreServiceDeps(),
  );
  ({
    listStores,
    setStore,
    removeStore,
  } = {
    listStores: storeService.listStores,
    setStore: storeService.setStore,
    removeStore: storeService.removeStore,
  });
}

export function useStores(storeId: string) {
  return useQuery({
    queryKey: ['stores', storeId],
    queryFn: () => (listStores ? listStores(storeId) : Promise.resolve([])),
    select: (data) => data ?? [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useStoreMutations(storeId: string) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (store: Store) =>
      setStore ? setStore(storeId, store) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', storeId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      removeStore ? removeStore(storeId, id) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', storeId] });
    },
  });

  return {
    setStore: upsert.mutateAsync,
    removeStore: remove.mutateAsync,
    isPending: upsert.isPending || remove.isPending,
  };
}
