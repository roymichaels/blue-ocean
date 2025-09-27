export type EventType = 'listings' | 'orders';

export function requireStoreId(storeId?: string | null): string {
  if (!storeId) {
    throw new Error('storeId is required');
  }
  return storeId;
}

export function topicFor(network: string, storeId: string, type: EventType): string {
  const selectedNetwork = network || 'testnet';
  const resolvedStoreId = requireStoreId(storeId);
  if (type !== 'listings' && type !== 'orders') {
    throw new Error('Invalid topic type');
  }
  return `/blueocean/${selectedNetwork}/${resolvedStoreId}/${type}`;
}

export default { requireStoreId, topicFor };
