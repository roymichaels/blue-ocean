import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { Product, Category } from '@/types';

let listCategories: (() => Promise<Category[]>) | undefined;
let listProducts: ((storeId: string) => Promise<Product[]>) | undefined;
if (chain === 'near') {
  ({ listCategories } = require('@/features/products/services/nearCategories'));
  ({ listProducts } = require('@/features/products/services/nearProducts'));
}

export function useHome() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const db = DatabaseService.getInstance();
      let productsData = await db.getProducts();
      if (productsData.length === 0) {
        const fallbackStore = process.env.EXPO_PUBLIC_DEFAULT_STORE;
        if (fallbackStore && listProducts) {
          try {
            productsData = await listProducts(fallbackStore);
          } catch {}
        }
      }
      const categoriesData = listCategories ? await listCategories() : [];
      return { productsData, categoriesData };
    },
    suspense: false,
  });

  const [products, setProducts] = useState<Product[]>(data?.productsData ?? []);
  const [categories, setCategories] = useState<Category[]>(data?.categoriesData ?? []);

  useEffect(() => {
    if (data) {
      setProducts(data.productsData);
      setCategories(data.categoriesData);
    }
  }, [data]);
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
    loading: isLoading,
    refreshing,
    error,
    reload: refresh,
    refresh,
    upsertProduct,
    removeProduct,
  };
}

export type UseHomeReturn = ReturnType<typeof useHome>;
