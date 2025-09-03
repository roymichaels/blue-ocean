import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@services/database';
import chain from '@services/chain';
import { Product } from '@/types';

let listProducts: ((storeId: string) => Promise<Product[]>) | undefined;
if (chain === 'near') {
  ({ listProducts } = require('@features/products/services/nearProducts'));
}

export function useProducts(storeId: string) {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      const db = DatabaseService.getInstance();
      let data = await db.getProducts();
      if (data.length === 0 && listProducts) {
        try {
          data = await listProducts(storeId);
        } catch {}
      }
      return data;
    },
    select: (data) => data ?? [],
  });
}
