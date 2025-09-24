import { useCallback, useEffect, useState } from 'react';
import chain from '@/services/chain';
import type { Store } from '@/types';
import type { StoreListStream } from '@/features/stores/services/nearStores';
import type { DiffMessage } from '@/services/warmCache';

let listStores: ((storeId: string) => StoreListStream) | undefined;
let setStore:
  | ((storeId: string, store: Store) => Promise<DiffMessage<Store> | null>)
  | undefined;
let removeStore:
  | ((storeId: string, id: string) => Promise<DiffMessage<Store> | null>)
  | undefined;
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
  const [data, setData] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!listStores) {
      setData([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const stream = listStores(storeId);
    setError(null);
    const snapshot = stream.getSnapshot();
    if (snapshot.length > 0) {
      setData([...snapshot]);
      setIsLoading(false);
    } else {
      setData([]);
      setIsLoading(true);
    }
    stream
      .read()
      .then((value) => {
        if (cancelled) return;
        setData([...value]);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setIsLoading(false);
      });
    const unsubscribe = stream.subscribe((value) => {
      if (cancelled) return;
      setData([...value]);
    });
    const offError = stream.onError((err) => {
      if (cancelled) return;
      setError(err);
    });
    return () => {
      cancelled = true;
      unsubscribe();
      offError();
    };
  }, [storeId]);

  return { data, isLoading, error };
}

export function useStoreMutations(storeId: string) {
  const [pending, setPending] = useState(0);

  const run = useCallback(async <T>(action: () => Promise<T>): Promise<T> => {
    setPending((count) => count + 1);
    try {
      return await action();
    } finally {
      setPending((count) => Math.max(0, count - 1));
    }
  }, []);

  const upsert = useCallback(
    (store: Store) => {
      if (!setStore) return Promise.resolve();
      return run(() => setStore(storeId, store));
    },
    [run, storeId],
  );

  const remove = useCallback(
    (id: string) => {
      if (!removeStore) return Promise.resolve();
      return run(() => removeStore(storeId, id));
    },
    [run, storeId],
  );

  return {
    setStore: upsert,
    removeStore: remove,
    isPending: pending > 0,
  };
}
