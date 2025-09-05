import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import { productsAdapter } from '@/features/products/services';
import { Product } from '@/types';

export function useProducts(storeId: string) {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      const db = DatabaseService.getInstance();
      let data = await db.getProducts();
      if (data.length === 0) {
        try {
          data = await productsAdapter.listProducts(storeId);
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
      productsAdapter.setProduct(storeId, product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => productsAdapter.removeProduct(storeId, id),
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
