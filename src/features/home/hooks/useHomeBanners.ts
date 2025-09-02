import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import { HeroBanner } from '@/types';

export function useHomeBanners() {
  const { data, refetch } = useQuery({
    queryKey: ['homeBanners'],
    queryFn: async () => {
      const db = DatabaseService.getInstance();
      return db.getHeroBanners();
    },
    suspense: true,
  });

  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>(data ?? []);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await refetch();
      if (res.data) {
        setHeroBanners(res.data);
      }
      setError(null);
    } catch (err) {
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
  } as const;
}

export type UseHomeBannersReturn = ReturnType<typeof useHomeBanners>;
