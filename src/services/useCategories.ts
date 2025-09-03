import { useQuery } from '@tanstack/react-query';
import chain from '@services/chain';
import { Category } from '@/types';

let listCategories: (() => Promise<Category[]>) | undefined;
if (chain === 'near') {
  ({ listCategories } = require('@features/products/services/nearCategories'));
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => (listCategories ? listCategories() : Promise.resolve([])),
    select: (data) => data ?? [],
  });
}
