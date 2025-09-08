import { useState, useCallback, useEffect } from 'react';
import { Product, Category } from '@/types';
import { useProducts } from '@/services/useProducts';
import { useCategories } from '@/services/useCategories';
import { requireEnv } from '@/services/config';
import { errorLog } from '@/utils/logger';

export function useHome() {
  const defaultStore = requireEnv('EXPO_PUBLIC_DEFAULT_STORE', 'default');
  const productsQuery = useProducts(defaultStore);
  const categoriesQuery = useCategories();

  const [products, setProducts] = useState<Product[]>(productsQuery.data ?? []);
  const [categories, setCategories] = useState<Category[]>(categoriesQuery.data ?? []);
  const [error, setError] = useState<Error | null>(
    (productsQuery.error || categoriesQuery.error) as Error | null,
  );

  useEffect(() => {
    if (productsQuery.data) {
      setProducts(productsQuery.data);
    }
  }, [productsQuery.data]);

  useEffect(() => {
    if (categoriesQuery.data) {
      setCategories(categoriesQuery.data);
    }
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (productsQuery.error || categoriesQuery.error) {
      const err = (productsQuery.error || categoriesQuery.error) as Error;
      setError(err);
      errorLog('useHome initial load failed', err);
    }
  }, [productsQuery.error, categoriesQuery.error]);

  const refresh = useCallback(async () => {
    try {
      await Promise.all([productsQuery.refetch(), categoriesQuery.refetch()]);
      setError(null);
    } catch (err) {
      setError(err as Error);
      errorLog('useHome refresh failed', err);
    }
  }, [productsQuery, categoriesQuery]);

  const upsertProduct = useCallback((p: Product, isNew: boolean) => {
    setProducts((prev) =>
      isNew ? [...prev, p] : prev.map((prod) => (prod.id === p.id ? p : prod)),
    );
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const loading = productsQuery.isLoading || categoriesQuery.isLoading;
  const refreshing = productsQuery.isFetching || categoriesQuery.isFetching;

  return {
    products,
    categories,
    loading,
    refreshing,
    error,
    refresh,
    upsertProduct,
    removeProduct,
  };
}

export type UseHomeReturn = ReturnType<typeof useHome>;
