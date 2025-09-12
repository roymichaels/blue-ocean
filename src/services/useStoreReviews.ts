import { useQuery } from '@tanstack/react-query';
import reviewAgent from '@/agents/review-agent';
import storesAgent from '@/agents/stores-agent';
import { useProducts } from './useProducts';

interface ReviewInfo {
  rating: number;
  count: number;
}

export type ReviewMap = Record<string, ReviewInfo>;

export function useStoreReviews(storeId: string | null) {
  const { data: products = [] } = useProducts(storeId);

  return useQuery({
    queryKey: ['store-reviews', storeId],
    queryFn: async () => {
      if (!storeId) return { reviews: {} as ReviewMap, score: 0 };
      const entries = await Promise.all(
        products.map(async (p) => {
          const revs = await reviewAgent.getByProduct(p.id);
          const count = revs.length;
          const rating = count > 0 ? revs.reduce((a, r) => a + r.rating, 0) / count : 0;
          return [p.id, { rating, count }] as [string, ReviewInfo];
        })
      );
      const reviews: ReviewMap = Object.fromEntries(entries);
      const score = storesAgent.getReputationScore(storeId);
      return { reviews, score };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!storeId && products.length > 0,
    initialData: { reviews: {} as ReviewMap, score: 0 },
  });
}

export default useStoreReviews;
