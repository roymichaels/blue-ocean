import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Category } from '@/types';
import invariant from '@/utils/invariant';

let listCategories: ((storeId: string) => Promise<Category[]>) | undefined;
if (chain === 'near') {
  ({ listCategories } = require('@/features/products/services/nearCategories'));
}

export function useCategories(storeId: string | null) {
  return useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => {
      invariant(storeId, 'storeId required');
      if (!listCategories) return Promise.resolve([] as Category[]);
      return listCategories(storeId);
    },
    select: (data) => data ?? [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!storeId,
  });
}
