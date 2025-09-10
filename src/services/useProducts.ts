import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import { productsAdapter } from '@/features/products/services';
import { Product } from '@/types';
import invariant from '@/utils/invariant';

export function useProducts(tenantId: string | null) {
  return useQuery({
    queryKey: ['products', tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as Product[];
      const db = DatabaseService.getInstance();
      let data = await db.getProducts();
      data = data.filter((p) => p.storeId === tenantId);
      if (data.length === 0) {
        try {
          data = await productsAdapter.listProducts(tenantId);
        } catch {}
      }
      return data;
    },
    select: (data) => data ?? [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!tenantId,
  });
}

export function useProductMutations(tenantId: string | null) {
  invariant(tenantId, 'tenantId required');
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (product: Product) =>
      productsAdapter.setProduct(tenantId, product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => productsAdapter.removeProduct(tenantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
    },
  });

  return {
    setProduct: upsert.mutateAsync,
    removeProduct: remove.mutateAsync,
    isPending: upsert.isPending || remove.isPending,
  };
}
