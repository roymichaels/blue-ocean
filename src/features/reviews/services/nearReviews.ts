// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { Review } from '@/types';
import { notImplemented } from '@/services/nearStub';

export async function getReviews(_productId: string): Promise<Review[]> {
  return notImplemented('getReviews');
}

export async function addReview(_review: Review): Promise<void> {
  return notImplemented('addReview');
}

export async function listAllReviews(): Promise<Review[]> {
  return notImplemented('listAllReviews');
}

export async function removeReview(_productId: string, _reviewId: string): Promise<void> {
  return notImplemented('removeReview');
}
