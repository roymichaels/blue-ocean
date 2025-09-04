import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { Product } from '@/types';

let listProducts: ((storeId: string) => Promise<Product[]>) | undefined;
let setProduct: ((storeId: string, product: Product) => Promise<void>) | undefined;
let removeProduct: ((storeId: string, id: string) => Promise<void>) | undefined;
if (chain === 'near') {
  ({ listProducts, setProduct, removeProduct } = require('@/features/products/services/nearProducts'));
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
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useProductMutations(storeId: string) {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (product: Product) =>
      setProduct ? setProduct(storeId, product) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      removeProduct ? removeProduct(storeId, id) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
    },
  });

  return {
    setProduct: upsert.mutateAsync,
    removeProduct: remove.mutateAsync,
    isPending: upsert.isPending || remove.isPending,
  };
}
