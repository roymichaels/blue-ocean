import type {
  CommerceClient,
  CommerceClientOptions,
  CommerceFeed,
  CommerceSearchResult,
  MessagePreview,
  Order,
  Store,
} from './types';
import { createMockCommerceClient } from './mockClient';

async function fetchJson<T>(url: string, fallback: () => Promise<T>): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn('[commerce] Falling back to mock data:', (error as Error).message);
    return fallback();
  }
}

export function createNetworkCommerceClient(options: CommerceClientOptions): CommerceClient {
  const baseUrl = options.baseUrl || process.env.EXPO_PUBLIC_API_URL;
  const mock = createMockCommerceClient({ mode: options.mode });

  if (!baseUrl) {
    console.warn('[commerce] Missing baseUrl for live mode. Mock data will be used.');
    return mock;
  }

  const api = (path: string) => {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl.replace(/\/$/, '')}/${normalized}`;
  };

  return {
    mode: options.mode,
    getFeed: () => fetchJson<CommerceFeed>(api('feed'), () => mock.getFeed()),
    getStores: () => fetchJson<Store[]>(api('stores'), () => mock.getStores()),
    getOrders: () => fetchJson<Order[]>(api('orders'), () => mock.getOrders()),
    getMessages: () => fetchJson<MessagePreview[]>(api('messages'), () => mock.getMessages()),
    search: (term: string) =>
      fetchJson<CommerceSearchResult>(
        api(`search?term=${encodeURIComponent(term)}`),
        () => mock.search(term)
      ),
  };
}
