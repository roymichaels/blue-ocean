import { useCallback } from 'react';
import type { UseHomeReturn } from './useHome';
import type { UseHomeBannersReturn } from './useHomeBanners';

export function useHomeRefresh(
  data: UseHomeReturn,
  banners: UseHomeBannersReturn,
) {
  const refreshing = data.refreshing || banners.refreshing;
  const refresh = useCallback(async () => {
    await Promise.all([data.refresh(), banners.refresh()]);
  }, [data, banners]);
  const error = data.error || banners.error;
  return { refreshing, refresh, error } as const;
}

export type UseHomeRefreshReturn = ReturnType<typeof useHomeRefresh>;
