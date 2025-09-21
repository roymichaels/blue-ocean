import { useCommerceResource } from './useCommerceResource';
import type { Store } from '@/data/commerce';

export function useStores() {
  return useCommerceResource<Store[]>((client) => client.getStores());
}
