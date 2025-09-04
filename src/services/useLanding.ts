import { useQuery } from '@tanstack/react-query';
import DatabaseService from '@/services/database';
import { Product, HeroBanner } from '@/types';

interface LandingData {
  featured: Product[];
  banners: HeroBanner[];
}

export function useLanding() {
  return useQuery<LandingData>({
    queryKey: ['landing'],
    queryFn: async () => {
      const db = DatabaseService.getInstance();
      const products = await db.getProducts();
      let banners: HeroBanner[] = [];
      try {
        banners = await db.getHeroBanners();
      } catch {
        // ignore errors fetching banners
      }
      return { featured: products.slice(0, 6), banners };
    },
    initialData: { featured: [], banners: [] },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
