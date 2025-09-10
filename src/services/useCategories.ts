import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Category } from '@/types';
import invariant from '@/utils/invariant';

let listCategories: ((storeId: string) => Promise<Category[]>) | undefined;
if (chain === 'near') {
  ({ listCategories } = require('@/features/products/services/nearCategories'));
}

export function useCategories(tenantId: string | null) {
  invariant(tenantId, 'tenantId required');
  return useQuery({
    queryKey: ['categories', tenantId],
    queryFn: () =>
      listCategories ? listCategories(tenantId) : Promise.resolve([]),
    select: (data) => data ?? [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!tenantId,
  });
}
