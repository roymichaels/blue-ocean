import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { Product, Category } from '@/types';

let listCategories: (() => Promise<Category[]>) | undefined;
if (chain === 'near') {
  ({ listCategories } = require('@/features/products/services/nearCategories'));
}

export function useHome() {
  const { data, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const db = DatabaseService.getInstance();
      const [productsData, categoriesData] = await Promise.all([
        db.getProducts(),
        listCategories ? listCategories() : Promise.resolve([]),
      ]);
      return { productsData, categoriesData };
    },
    suspense: true,
  });

  const [products, setProducts] = useState<Product[]>(data.productsData);
  const [categories, setCategories] = useState<Category[]>(data.categoriesData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await refetch();
      if (res.data) {
        setProducts(res.data.productsData);
        setCategories(res.data.categoriesData);
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const upsertProduct = useCallback((p: Product, isNew: boolean) => {
    setProducts((prev) =>
      isNew ? [...prev, p] : prev.map((prod) => (prod.id === p.id ? p : prod)),
    );
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    products,
    categories,
    loading: false,
    refreshing,
    error,
    reload: refresh,
    refresh,
    upsertProduct,
    removeProduct,
  };
}

export type UseHomeReturn = ReturnType<typeof useHome>;
