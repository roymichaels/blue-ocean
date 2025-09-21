import { useCommerceResource } from './useCommerceResource';
import type { MessagePreview } from '@/data/commerce';

export function useMessages() {
  return useCommerceResource<MessagePreview[]>((client) => client.getMessages());
}
