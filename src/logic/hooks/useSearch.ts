import { useCallback, useState } from 'react';
import type { CommerceSearchResult } from '@/data/commerce';
import { useCommerceClient } from '@/application/providers/CommerceProvider';

interface SearchState {
  result: CommerceSearchResult | null;
  loading: boolean;
  error: Error | null;
}

export function useSearch() {
  const client = useCommerceClient();
  const [state, setState] = useState<SearchState>({ result: null, loading: false, error: null });

  const search = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setState({ result: null, loading: false, error: null });
        return;
      }
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await client.search(term);
        setState({ result, loading: false, error: null });
      } catch (error) {
        setState({ result: null, loading: false, error: error as Error });
      }
    },
    [client]
  );

  return { ...state, search };
}
