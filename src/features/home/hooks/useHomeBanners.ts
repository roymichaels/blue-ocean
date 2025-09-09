import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import { HeroBanner } from '@/types';
import { errorLog, debugLog } from '@/utils/logger';

export function useHomeBanners() {
  const { data, refetch, isLoading, error: queryError } = useQuery({
    queryKey: ['homeBanners'],
    queryFn: async () => {
      try {
        const db = DatabaseService.getInstance();
        return await db.getHeroBanners();
      } catch (err) {
        debugLog('useHomeBanners query failed', err);
        errorLog('useHomeBanners query failed', err);
        throw err;
      }
    },
    suspense: false,
  });
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>(data ?? []);

  useEffect(() => {
    if (data) {
      setHeroBanners(data);
    }
  }, [data]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (queryError) {
      if (lastErrorRef.current !== queryError) {
        lastErrorRef.current = queryError as Error;
        setError(queryError as Error);
      }
      debugLog('useHomeBanners initial load failed', queryError);
      errorLog('useHomeBanners initial load failed', queryError);
    }
  }, [queryError]);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await refetch();
      if (res.data) {
        setHeroBanners(res.data);
      }
      const err = res.error as Error | null;
      if (err) {
        if (lastErrorRef.current !== err) {
          lastErrorRef.current = err;
          setError(err);
        }
        debugLog('useHomeBanners refresh failed', err);
        errorLog('useHomeBanners refresh failed', err);
      } else {
        lastErrorRef.current = null;
        setError(null);
      }
    } catch (err) {
      const error = err as Error;
      if (lastErrorRef.current !== error) {
        lastErrorRef.current = error;
        setError(error);
      }
      debugLog('useHomeBanners refresh failed', error);
      errorLog('useHomeBanners refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const upsertBanner = useCallback((b: HeroBanner, isNew: boolean) => {
    setHeroBanners((prev) =>
      isNew ? [...prev, b] : prev.map((h) => (h.id === b.id ? b : h)),
    );
  }, []);

  const removeBanner = useCallback((id: string) => {
    setHeroBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return {
    heroBanners,
    refreshing,
    error,
    refresh,
    upsertBanner,
    removeBanner,
    loading: isLoading,
  } as const;
}

export type UseHomeBannersReturn = ReturnType<typeof useHomeBanners>;
