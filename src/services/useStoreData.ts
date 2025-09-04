import { useEffect, useState } from 'react';
import storesAgent, { selectStore } from '@/agents/stores-agent';
import { getProducts } from '@/agents/products-agent';
import reviewAgent from '@/agents/review-agent';
import { Store, Product } from '@/types';

interface ReviewInfo {
  rating: number;
  count: number;
}

export type ReviewMap = Record<string, ReviewInfo>;

export function useStoreData(storeId?: string) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [score, setScore] = useState(0);

  useEffect(() => {
    let callback: ((id: string, score: number) => void) | undefined;
    const load = async () => {
      if (!storeId) return;
      const s = await selectStore(storeId);
      setStore(s);
      setScore(storesAgent.getReputationScore(storeId));
      const all = await getProducts();
      const filtered = all.filter((p) => p.storeId === storeId);
      setProducts(filtered);
      const entries = await Promise.all(
        filtered.map(async (p) => {
          const revs = await reviewAgent.getByProduct(p.id);
          const count = revs.length;
          const rating = count > 0 ? revs.reduce((a, r) => a + r.rating, 0) / count : 0;
          return [p.id, { rating, count }] as [string, ReviewInfo];
        })
      );
      const map: ReviewMap = {};
      entries.forEach(([pid, info]) => {
        map[pid] = info;
      });
      setReviews(map);
      callback = (sid, sc) => {
        if (sid === storeId) setScore(sc);
      };
      storesAgent.subscribe(callback);
    };
    void load();
    return () => {
      if (callback) storesAgent.unsubscribe(callback);
    };
  }, [storeId]);

  return { store, products, reviews, score };
}

