import { getValue, setValue, listValues } from '@services/nearKvStore';
import { Review } from '@/types';
import { assertNearChain } from '@services/chain';
import { getNearContract } from '@/utils/nearEnv';

assertNearChain();

const ADDRESS = getNearContract('REVIEWS');

export async function getReviews(productId: string): Promise<Review[]> {
  const res = await getValue(ADDRESS, productId);
  return res ? (JSON.parse(res) as Review[]) : [];
}

export async function addReview(review: Review) {
  const existing = await getReviews(review.productId);
  const updated = [...existing, review];
  await setValue(ADDRESS, review.productId, JSON.stringify(updated));
}

export async function listAllReviews(): Promise<Review[]> {
  const items = await listValues(ADDRESS);
  return items.flatMap((i) => JSON.parse(i.value) as Review[]);
}

export async function removeReview(productId: string, reviewId: string) {
  const existing = await getReviews(productId);
  const updated = existing.filter((r) => r.id !== reviewId);
  await setValue(ADDRESS, productId, JSON.stringify(updated));
}

