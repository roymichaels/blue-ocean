import { useState, useEffect, useCallback } from 'react';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { Product, Category, HeroBanner } from '@/types';

let listCategories: (() => Promise<Category[]>) | undefined;
if (chain === 'ton') {
  ({ listCategories } = require('@/features/products/services/tonCategories'));
}

export function useHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      const [productsData, categoriesData, bannersData] = await Promise.all([
        db.getProducts(),
        listCategories ? listCategories() : Promise.resolve([]),
        db.getHeroBanners(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setHeroBanners(bannersData);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const upsertBanner = useCallback((b: HeroBanner, isNew: boolean) => {
    setHeroBanners((prev) =>
      isNew ? [...prev, b] : prev.map((h) => (h.id === b.id ? b : h)),
    );
  }, []);

  const removeBanner = useCallback((id: string) => {
    setHeroBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const upsertProduct = useCallback((p: Product, isNew: boolean) => {
    setProducts((prev) =>
      isNew ? [...prev, p] : prev.map((prod) => (prod.id === p.id ? p : prod)),
    );
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    products,
    categories,
    heroBanners,
    loading,
    refreshing,
    error,
    reload: loadData,
    refresh,
    upsertBanner,
    removeBanner,
    upsertProduct,
    removeProduct,
  };
}

export type UseHomeReturn = ReturnType<typeof useHome>;
