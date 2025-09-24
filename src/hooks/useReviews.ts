import { useState, useEffect } from 'react';
import { errorLog } from '@/utils/logger';
import { Review } from '@/types';
import reviewAgent from '@/agents/review-agent';

export function useReviews(productId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!productId) return;
    const loadReviews = async () => {
      try {
        const list = await reviewAgent.getByProduct(productId);
        setReviews(list);
      } catch (err) {
        errorLog('Error loading reviews:', err);
      }
    };
    loadReviews();
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const sub = (rev: Review) => {
      if (rev.productId === productId) {
        setReviews(prev => [rev, ...prev]);
      }
    };
    reviewAgent.subscribe(sub);
    return () => reviewAgent.unsubscribe(sub);
  }, [productId]);

  return reviews;
}

export default useReviews;
