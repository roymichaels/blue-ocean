import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import chain from '@/services/chain';
import { Product, Category, HeroBanner } from '@/types';

let listCategories: (() => Promise<Category[]>) | undefined;
if (chain === 'near') {
  ({ listCategories } = require('@/features/products/services/nearCategories'));
}

export function useHome() {
  const { data, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const db = DatabaseService.getInstance();
      const [productsData, categoriesData, bannersData] = await Promise.all([
        db.getProducts(),
        listCategories ? listCategories() : Promise.resolve([]),
        db.getHeroBanners(),
      ]);
      return { productsData, categoriesData, bannersData };
    },
    suspense: true,
  });

  const [products, setProducts] = useState<Product[]>(data.productsData);
  const [categories, setCategories] = useState<Category[]>(data.categoriesData);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>(data.bannersData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await refetch();
      if (res.data) {
        setProducts(res.data.productsData);
        setCategories(res.data.categoriesData);
        setHeroBanners(res.data.bannersData);
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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

  return {
    products,
    categories,
    heroBanners,
    loading: false,
    refreshing,
    error,
    reload: refresh,
    refresh,
    upsertBanner,
    removeBanner,
    upsertProduct,
    removeProduct,
  };
}

export type UseHomeReturn = ReturnType<typeof useHome>;
