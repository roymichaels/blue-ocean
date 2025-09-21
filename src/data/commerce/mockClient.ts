import type {
  CommerceClient,
  CommerceClientOptions,
  CommerceFeed,
  CommerceSearchResult,
  MessagePreview,
  Order,
  Store,
} from './types';
import { feed, messages, orders, products, stores } from './mockData';

const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const matches = (value: string, term: string) => value.toLowerCase().includes(term.toLowerCase());

export function createMockCommerceClient(options?: Partial<CommerceClientOptions>): CommerceClient {
  const mode = options?.mode ?? 'mock';

  const withLatency = async <T>(factory: () => T): Promise<T> => {
    await delay(220);
    return factory();
  };

  const getFeed = async (): Promise<CommerceFeed> => withLatency(() => feed);
  const getStores = async (): Promise<Store[]> => withLatency(() => stores);
  const getOrders = async (): Promise<Order[]> => withLatency(() => orders);
  const getMessages = async (): Promise<MessagePreview[]> => withLatency(() => messages);

  const search = async (term: string): Promise<CommerceSearchResult> =>
    withLatency(() => ({
      stores: stores.filter(
        (store) =>
          matches(store.name, term) ||
          matches(store.tagline, term) ||
          store.categories.some((category) => matches(category, term))
      ),
      products: products.filter(
        (product) =>
          matches(product.name, term) ||
          matches(product.description, term) ||
          product.tags.some((tag) => matches(tag, term))
      ),
    }));

  return {
    mode,
    getFeed,
    getStores,
    getOrders,
    getMessages,
    search,
  };
}
