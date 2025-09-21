import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommerceClient } from '@/data/commerce';
import { useCommerceClient } from '@/application/providers/CommerceProvider';

export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ResourceState<T> {
  data: T | null;
  status: ResourceStatus;
  error: Error | null;
  refresh: () => void;
}

export function useCommerceResource<T>(fetcher: (client: CommerceClient) => Promise<T>, deps: unknown[] = []): ResourceState<T> {
  const client = useCommerceClient();
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const requestId = useRef(0);

  const execute = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setStatus('loading');
    setError(null);
    try {
      const result = await fetcher(client);
      if (currentRequest === requestId.current) {
        setData(result);
        setStatus('ready');
      }
    } catch (err) {
      if (currentRequest === requestId.current) {
        setError(err as Error);
        setStatus('error');
      }
    }
  }, [client, fetcher]);

  useEffect(() => {
    void execute();
    return () => {
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, ...deps]);

  const refresh = useCallback(() => {
    void execute();
  }, [execute]);

  return useMemo(() => ({ data, status, error, refresh }), [data, status, error, refresh]);
}
