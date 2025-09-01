import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { Product } from '@/types';

let getProduct: ((storeId: string, id: string) => Promise<Product | null>) | undefined;
if (chain === 'near') {
  ({ getProduct } = require('../services/nearProducts'));
}

export function useProduct(id?: string, storeId: string = 'default') {
  return useQuery({
    queryKey: ['product', storeId, id],
    queryFn: () =>
      getProduct && id ? getProduct(storeId, id) : Promise.resolve(null),
    enabled: !!id && !!getProduct,
    staleTime: 5 * 60 * 1000,
  });
}
