import { useCommerceResource } from './useCommerceResource';
import type { CommerceFeed } from '@/data/commerce';

export function useFeed() {
  return useCommerceResource<CommerceFeed>((client) => client.getFeed());
}
