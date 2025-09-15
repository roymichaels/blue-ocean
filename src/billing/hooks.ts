import { useCallback, useEffect, useMemo, useState } from 'react';
import MeteredBillingService from './MeteredBillingService';
import type { BillingSummary } from './types';

const service = MeteredBillingService.getInstance();

type LoadMode = 'initial' | 'refresh';

interface UseBillingSummaryResult {
  data: BillingSummary | null;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<BillingSummary | null>;
}

export function useBillingSummary(tenantId: string | null): UseBillingSummaryResult {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!tenantId);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const load = useCallback(
    async (mode: LoadMode = 'initial'): Promise<BillingSummary | null> => {
      if (!tenantId) {
        setData(null);
        setError(null);
        setIsLoading(false);
        setIsFetching(false);
        return null;
      }
      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsFetching(true);
      }
      try {
        const summary = await service.getSummary(tenantId);
        setData(summary);
        setError(null);
        return summary;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to load billing summary');
        setError(e);
        return null;
      } finally {
        if (mode === 'initial') {
          setIsLoading(false);
        } else {
          setIsFetching(false);
        }
      }
    },
    [tenantId],
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  useEffect(() => {
    if (!tenantId) return;
    return service.subscribe(tenantId, () => {
      void load('refresh');
    });
  }, [tenantId, load]);

  const refetch = useCallback(() => load('refresh'), [load]);

  return useMemo(
    () => ({ data, error, isLoading, isFetching, refetch }),
    [data, error, isLoading, isFetching, refetch],
  );
}

export default useBillingSummary;
