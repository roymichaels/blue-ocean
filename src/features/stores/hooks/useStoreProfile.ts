import { useEffect, useMemo, useRef, useState } from 'react';
import { selectStore } from '@/agents/stores-agent';
import type { Store } from '@/types';

type WarmCache = {
  getById(id: string): Store | undefined;
  subscribe(
    filter: (id: string, value: Store | undefined) => boolean,
    cb: (id: string, value: Store | undefined) => void,
  ): () => void;
};

let warmCache: WarmCache | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@/features/stores/services/nearStores');
  if (mod && typeof mod === 'object' && 'storesWarmCache' in mod) {
    warmCache = mod.storesWarmCache as WarmCache;
  }
} catch {
  warmCache = null;
}

type Source = 'cache' | 'network';

export interface UseStoreProfileResult {
  store: (Store & Record<string, unknown>) | null;
  isLoading: boolean;
  error: Error | null;
  source: Source | null;
  isOffline: boolean;
}

export function useStoreProfile(storeId?: string | null): UseStoreProfileResult {
  const [store, setStore] = useState<(Store & Record<string, unknown>) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasCacheData, setHasCacheData] = useState(false);
  const [hasNetworkData, setHasNetworkData] = useState(false);
  const [stale, setStale] = useState(false);

  const storeRef = useRef(store);
  const hasCacheRef = useRef(hasCacheData);
  const hasNetworkRef = useRef(hasNetworkData);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    hasCacheRef.current = hasCacheData;
  }, [hasCacheData]);

  useEffect(() => {
    hasNetworkRef.current = hasNetworkData;
  }, [hasNetworkData]);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      setIsLoading(false);
      setError(new Error('STORE_ID_REQUIRED'));
      setHasCacheData(false);
      setHasNetworkData(false);
      setStale(false);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    const applyStore = (value: Store, from: Source) => {
      if (!active) return;
      const snapshot = value as Store & Record<string, unknown>;
      setStore(snapshot);
      if (from === 'cache') {
        setHasCacheData(true);
      }
      if (from === 'network') {
        setHasNetworkData(true);
        setStale(false);
        setError(null);
      }
      if (from === 'cache' && !hasNetworkRef.current) {
        setError(null);
      }
      setIsLoading(false);
    };

    const clearCache = () => {
      if (!active) return;
      setHasCacheData(false);
      if (!hasNetworkRef.current) {
        setStore(null);
        setIsLoading(true);
      }
    };

    setIsLoading(!storeRef.current);
    setError(null);
    setStale(false);
    setHasCacheData(false);
    setHasNetworkData(false);

    if (warmCache) {
      try {
        const cached = warmCache.getById(storeId);
        if (cached) {
          applyStore(cached, 'cache');
        }
        unsubscribe = warmCache.subscribe(
          (id) => id === storeId,
          (id, value) => {
            if (!active || id !== storeId) return;
            if (value) {
              applyStore(value, 'cache');
            } else {
              clearCache();
            }
          },
        );
      } catch {
        // ignore cache failures
      }
    }

    (async () => {
      try {
        const fresh = await selectStore(storeId);
        if (!active) return;
        if (fresh) {
          applyStore(fresh, 'network');
        } else if (!hasCacheRef.current) {
          setStore(null);
          setError(new Error('STORE_NOT_FOUND'));
        }
      } catch (err) {
        if (!active) return;
        if (hasCacheRef.current) {
          setStale(true);
        } else {
          setError(err instanceof Error ? err : new Error('FAILED_TO_LOAD_STORE'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {
          // ignore unsubscribe errors
        }
      }
    };
  }, [storeId]);

  const source: Source | null = useMemo(() => {
    if (hasNetworkData) return 'network';
    if (hasCacheData) return 'cache';
    return null;
  }, [hasCacheData, hasNetworkData]);

  const computedError = store ? null : error;
  const isOffline = Boolean(stale || (hasCacheData && !hasNetworkData));

  return {
    store,
    isLoading,
    error: computedError,
    source,
    isOffline,
  };
}

export default useStoreProfile;
