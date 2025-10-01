import { useCallback, useEffect, useState } from 'react';
import type { EmpireMetrics } from '@/services/manager/metrics';
import { fetchEmpireMetrics } from '@/services/manager/metrics';

interface EmpireMetricsState {
  loading: boolean;
  error: Error | null;
  data: EmpireMetrics | null;
}

export interface UseEmpireMetricsResult {
  loading: boolean;
  error: Error | null;
  data: EmpireMetrics | null;
  refreshing: boolean;
  refetch: () => Promise<void>;
}

export function useEmpireMetrics(storeId?: string): UseEmpireMetricsResult {
  const [state, setState] = useState<EmpireMetricsState>({
    loading: true,
    error: null,
    data: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (nextStoreId?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const metrics = await fetchEmpireMetrics(nextStoreId);
      setState({ loading: false, error: null, data: metrics });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load metrics');
      setState((prev) => ({ ...prev, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    void load(storeId);
  }, [load, storeId]);

  const refetch = useCallback(async () => {
    setRefreshing(true);
    try {
      const metrics = await fetchEmpireMetrics(storeId);
      setState({ loading: false, error: null, data: metrics });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh metrics');
      setState((prev) => ({ ...prev, loading: false, error }));
    } finally {
      setRefreshing(false);
    }
  }, [storeId]);

  return { ...state, refreshing, refetch };
}
