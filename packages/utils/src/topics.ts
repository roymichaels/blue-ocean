export type EventType = 'listings' | 'orders';

export function topicFor(network: string, storeId: string, type: EventType) {
  if (!network) network = 'testnet';
  if (!storeId) throw new Error('storeId required for topic');
  if (type !== 'listings' && type !== 'orders') throw new Error('Invalid topic type');
  return `/blueocean/${network}/${storeId}/${type}`;
}

export default { topicFor };

