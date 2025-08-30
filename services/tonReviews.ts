import { getValue, setValue, listValues } from './tonKvStore';
import { Review } from '../types';
import { requireEnv } from '../utils/appConfig';
import { assertTonChain } from './chain';

assertTonChain();

const CHAIN = (process.env.EXPO_PUBLIC_CHAIN || '').toLowerCase();
const ADDRESS = CHAIN === 'ton' ? requireEnv('TON_REVIEWS_ADDRESS') : 'ton:disabled';

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

