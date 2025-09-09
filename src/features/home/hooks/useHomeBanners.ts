import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import { HeroBanner } from '@/types';
import { errorLog } from '@/utils/logger';

export function useHomeBanners() {
  const { data, refetch, isLoading, error: queryError } = useQuery({
    queryKey: ['homeBanners'],
    queryFn: async () => {
      try {
        const db = DatabaseService.getInstance();
        return await db.getHeroBanners();
      } catch (err) {
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
  const [error, setError] = useState<Error | null>(queryError ?? null);

  useEffect(() => {
    if (queryError) {
      setError(queryError as Error);
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
      if (res.error) {
        errorLog('useHomeBanners refresh failed', res.error);
        setError(res.error as Error);
      } else {
        setError(null);
      }
    } catch (err) {
      errorLog('useHomeBanners refresh failed', err);
      setError(err as Error);
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
