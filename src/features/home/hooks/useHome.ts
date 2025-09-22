import { useState, useCallback, useEffect, useRef } from 'react';
import { Product, Category } from '@/types';
import { useProducts } from '@/services/useProducts';
import { useCategories } from '@/services/useCategories';
import { errorLog, debugLog } from '@/utils/logger';

export function useHome(tenantId: string | null) {
  const productsQuery = useProducts(tenantId);
  const categoriesQuery = useCategories(tenantId);

  const [products, setProducts] = useState<Product[]>(productsQuery.data ?? []);
  const [categories, setCategories] = useState<Category[]>(categoriesQuery.data ?? []);
  const [error, setError] = useState<Error | null>(null);
  const lastErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (!tenantId || !productsQuery.data) return;
    setProducts(productsQuery.data);
  }, [tenantId, productsQuery.data]);

  useEffect(() => {
    if (!tenantId || !categoriesQuery.data) return;
    setCategories(categoriesQuery.data);
  }, [tenantId, categoriesQuery.data]);

  useEffect(() => {
    if (!tenantId) return;
    if (productsQuery.error || categoriesQuery.error) {
      const err = (productsQuery.error || categoriesQuery.error) as Error;
      if (lastErrorRef.current !== err) {
        lastErrorRef.current = err;
        setError(err);
      }
      debugLog('useHome initial load failed', err);
      errorLog('useHome initial load failed', err);
    }
  }, [tenantId, productsQuery.error, categoriesQuery.error]);

  const refresh = useCallback(async () => {
    if (!tenantId) return;
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
  }, [tenantId, productsQuery, categoriesQuery]);

  const upsertProduct = useCallback((p: Product, isNew: boolean) => {
    setProducts(prev => (isNew ? [...prev, p] : prev.map(prod => (prod.id === p.id ? p : prod))));
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const loading = tenantId ? productsQuery.isLoading || categoriesQuery.isLoading : false;
  const refreshing = tenantId ? productsQuery.isFetching || categoriesQuery.isFetching : false;

  return {
    products: tenantId ? products : [],
    categories: tenantId ? categories : [],
    loading,
    refreshing,
    error: tenantId ? error : null,
    refresh,
    upsertProduct,
    removeProduct,
  } as const;
}

export type UseHomeReturn = ReturnType<typeof useHome>;
