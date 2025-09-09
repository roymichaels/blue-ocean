import { useState, useCallback, useEffect, useRef } from 'react';
import { Product, Category } from '@/types';
import { useProducts } from '@/services/useProducts';
import { useCategories } from '@/services/useCategories';
import { requireEnv } from '@/services/config';
import { errorLog, debugLog } from '@/utils/logger';

export function useHome() {
  const defaultStore = requireEnv('EXPO_PUBLIC_DEFAULT_STORE', 'default');
  const productsQuery = useProducts(defaultStore);
  const categoriesQuery = useCategories();

  const [products, setProducts] = useState<Product[]>(productsQuery.data ?? []);
  const [categories, setCategories] = useState<Category[]>(categoriesQuery.data ?? []);
  const [error, setError] = useState<Error | null>(null);
  const lastErrorRef = useRef<Error | null>(null);

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
      if (lastErrorRef.current !== err) {
        lastErrorRef.current = err;
        setError(err);
      }
      debugLog('useHome initial load failed', err);
      errorLog('useHome initial load failed', err);
    }
  }, [productsQuery.error, categoriesQuery.error]);

  const refresh = useCallback(async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productsQuery.refetch(),
        categoriesQuery.refetch(),
      ]);
      const err = (productsRes.error || categoriesRes.error) as Error | null;
      if (err) {
        if (lastErrorRef.current !== err) {
          lastErrorRef.current = err;
          setError(err);
        }
        debugLog('useHome refresh failed', err);
        errorLog('useHome refresh failed', err);
      } else {
        lastErrorRef.current = null;
        setError(null);
      }
    } catch (err) {
      const error = err as Error;
      if (lastErrorRef.current !== error) {
        lastErrorRef.current = error;
        setError(error);
      }
      debugLog('useHome refresh failed', error);
      errorLog('useHome refresh failed', error);
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
