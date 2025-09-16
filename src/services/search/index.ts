import Fuse from 'fuse.js';
import type { Product, Store, Order, ChatMessage, ChatRoom, OrderStatus } from '@/types';
import { normalizeHebrew } from '@/utils/strings';

export type SearchDomain = 'products' | 'stores' | 'orders' | 'messages';

export interface ProductFilters {
  category?: string | null;
  inStockOnly?: boolean;
}

export interface StoreFilters {
  plan?: string | null;
  minReputation?: number;
}

export interface OrderFilters {
  status?: OrderStatus | 'open' | null;
}

export interface MessageFilters {
  threadId?: string | null;
}

export interface SearchResult {
  id: string;
  domain: SearchDomain;
  title: string;
  subtitle?: string;
  route: string;
  params?: Record<string, string>;
  metadata?: Record<string, unknown>;
  score: number;
}

export interface SearchIndexPayload {
  products?: Product[];
  stores?: Store[];
  orders?: Order[];
  messages?: Array<{ room: ChatRoom; messages: ChatMessage[] }>;
}

interface ProductDoc extends Product {}

interface StoreDoc extends Store {
  reputationScore: number;
}

interface OrderDoc extends Order {
  itemText: string;
  createdAtValue: number;
}

interface MessageDoc {
  id: string;
  threadId: string;
  threadName: string;
  senderName: string;
  message: string;
  messageNormalized: string;
  senderNormalized: string;
  threadNormalized: string;
  tokens: Set<string>;
  timestamp: number;
}

const NORMALIZED_EMPTY = '' as const;

function toNormalized(value: string | null | undefined): string {
  if (!value) return NORMALIZED_EMPTY;
  return normalizeHebrew(value).toLowerCase();
}

function normalizeSearchValue(value: unknown): string | readonly string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? toNormalized(entry) : null))
      .filter((entry): entry is string => entry !== null);
  }

  if (typeof value === 'string') {
    return toNormalized(value);
  }

  if (value == null) {
    return NORMALIZED_EMPTY;
  }

  return toNormalized(String(value));
}

function scheduleIdle(callback: () => void) {
  const idle = (globalThis as unknown as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  if (typeof idle === 'function') {
    idle(callback);
  } else {
    setTimeout(callback, 16);
  }
}

function toScoreFromFuse(score?: number | null, index = 0): number {
  if (typeof score === 'number') {
    const clamped = Math.max(0, Math.min(1, score));
    return 1 - clamped;
  }
  return Math.max(0.1, 0.95 - index * 0.05);
}

function parseDate(value?: string | number | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function generateNgrams(text: string): Set<string> {
  const normalized = toNormalized(text).replace(/\s+/g, ' ').trim();
  const grams = new Set<string>();
  if (!normalized) return grams;
  const words = normalized.split(' ');
  for (const word of words) {
    const clean = word.trim();
    if (!clean) continue;
    const len = clean.length;
    for (let size = 1; size <= 4; size += 1) {
      if (len < size) continue;
      for (let start = 0; start <= len - size; start += 1) {
        grams.add(clean.slice(start, start + size));
      }
    }
    grams.add(clean);
  }
  return grams;
}

let productDocs: ProductDoc[] = [];
let storeDocs: StoreDoc[] = [];
let orderDocs: OrderDoc[] = [];
let messageDocs: MessageDoc[] = [];

let productFuse: Fuse<ProductDoc> | null = null;
let storeFuse: Fuse<StoreDoc> | null = null;
let orderFuse: Fuse<OrderDoc> | null = null;

function buildProductFuse(docs: ProductDoc[]) {
  if (docs.length === 0) {
    productFuse = null;
    return;
  }
  productFuse = new Fuse(docs, {
    keys: ['name', 'description', 'category', 'name_en', 'name_he', 'description_en', 'description_he'],
    threshold: 0.3,
    ignoreLocation: true,
    getFn: (obj, path) => {
      const value = Fuse.config.getFn(obj, path);
      return normalizeSearchValue(value);
    },
  });
}

function buildStoreFuse(docs: StoreDoc[]) {
  if (docs.length === 0) {
    storeFuse = null;
    return;
  }
  storeFuse = new Fuse(docs, {
    keys: ['name', 'owner', 'plan'],
    threshold: 0.3,
    ignoreLocation: true,
    getFn: (obj, path) => {
      const value = Fuse.config.getFn(obj, path);
      return normalizeSearchValue(value);
    },
  });
}

function buildOrderFuse(docs: OrderDoc[]) {
  if (docs.length === 0) {
    orderFuse = null;
    return;
  }
  orderFuse = new Fuse(docs, {
    keys: ['id', 'status', 'itemText', 'buyerAddress', 'sellerAddress', 'userId'],
    threshold: 0.35,
    ignoreLocation: true,
    getFn: (obj, path) => {
      const value = Fuse.config.getFn(obj, path);
      return normalizeSearchValue(value);
    },
  });
}

function indexProducts(products: Product[]) {
  productDocs = products.slice();
  buildProductFuse(productDocs);
}

function indexStores(stores: Store[]) {
  storeDocs = stores.map((store) => ({
    ...store,
    reputationScore: typeof store.reputation === 'number' ? store.reputation : 0,
  }));
  buildStoreFuse(storeDocs);
}

function indexOrders(orders: Order[]) {
  orderDocs = orders.map((order) => ({
    ...order,
    itemText: order.items
      ?.map((item) => item.product?.name || item.product?.id || '')
      .filter(Boolean)
      .join(' '),
    createdAtValue: parseDate(order.createdAt),
  }));
  buildOrderFuse(orderDocs);
}

function indexMessages(payload: Array<{ room: ChatRoom; messages: ChatMessage[] }>) {
  const docs: MessageDoc[] = [];
  for (const { room, messages } of payload) {
    const relevant = messages.slice(-100);
    for (const message of relevant) {
      docs.push({
        id: message.id,
        threadId: room.id,
        threadName: room.userName || room.id,
        senderName: message.senderName || '',
        message: message.message || '',
        messageNormalized: toNormalized(message.message || ''),
        senderNormalized: toNormalized(message.senderName || ''),
        threadNormalized: toNormalized(room.userName || room.id),
        tokens: generateNgrams(message.message || ''),
        timestamp: message.timestamp || 0,
      });
    }
  }
  messageDocs = docs;
}

function formatPrice(price: number | undefined): number {
  if (typeof price !== 'number' || Number.isNaN(price)) return 0;
  return price;
}

function filterProducts(docs: ProductDoc[], filters?: ProductFilters) {
  let result = docs;
  if (filters?.category) {
    result = result.filter((item) => item.category === filters.category);
  }
  if (filters?.inStockOnly) {
    result = result.filter((item) => (item.stock ?? 0) > 0);
  }
  return result;
}

function filterStores(docs: StoreDoc[], filters?: StoreFilters) {
  let result = docs;
  if (filters?.plan && filters.plan !== 'all') {
    result = result.filter((item) => item.plan === filters.plan);
  }
  if (typeof filters?.minReputation === 'number') {
    result = result.filter((item) => item.reputationScore >= filters.minReputation!);
  }
  return result;
}

function filterOrders(docs: OrderDoc[], filters?: OrderFilters) {
  if (!filters?.status) return docs;
  if (filters.status === 'open') {
    return docs.filter(
      (order) => !['delivered', 'released', 'refunded'].includes(order.status),
    );
  }
  return docs.filter((order) => order.status === filters.status);
}

function filterMessages(docs: MessageDoc[], filters?: MessageFilters) {
  if (!filters?.threadId) return docs;
  return docs.filter((doc) => doc.threadId === filters.threadId);
}

function queryProducts(query: string, filters?: ProductFilters): SearchResult[] {
  const trimmed = query.trim();
  let baseList: ProductDoc[] = [];
  const scores = new Map<string, number>();
  if (!trimmed) {
    baseList = productDocs.slice(0, 25);
  } else if (productFuse) {
    const results = productFuse.search(toNormalized(trimmed));
    results.forEach(({ item, score }) => {
      baseList.push(item);
      if (typeof score === 'number') {
        scores.set(item.id, score);
      }
    });
  }
  const filtered = filterProducts(baseList.length ? baseList : productDocs, filters);
  return filtered.slice(0, 20).map((product, index) => ({
    id: product.id,
    domain: 'products',
    title: product.name,
    subtitle: product.description,
    route: `/store/${product.storeId}/product/${product.id}`,
    metadata: {
      category: product.category,
      price: formatPrice(product.price),
    },
    score: scores.size
      ? toScoreFromFuse(scores.get(product.id), index)
      : 0.9 - index * 0.03,
  }));
}

function queryStores(query: string, filters?: StoreFilters): SearchResult[] {
  const trimmed = query.trim();
  let baseList: StoreDoc[] = [];
  const scores = new Map<string, number>();
  if (!trimmed) {
    baseList = storeDocs.slice(0, 25);
  } else if (storeFuse) {
    const results = storeFuse.search(toNormalized(trimmed));
    results.forEach(({ item, score }) => {
      baseList.push(item);
      if (typeof score === 'number') {
        scores.set(item.id, score);
      }
    });
  }
  const filtered = filterStores(baseList.length ? baseList : storeDocs, filters);
  return filtered.slice(0, 20).map((store, index) => ({
    id: store.id,
    domain: 'stores',
    title: store.name,
    subtitle: store.owner,
    route: `/store/${store.id}`,
    metadata: {
      plan: store.plan || 'free',
      reputation: store.reputationScore,
    },
    score: scores.size
      ? toScoreFromFuse(scores.get(store.id), index)
      : 0.85 - index * 0.03,
  }));
}

function queryOrders(query: string, filters?: OrderFilters): SearchResult[] {
  const trimmed = query.trim();
  let baseList: OrderDoc[] = [];
  const scores = new Map<string, number>();
  if (!trimmed) {
    baseList = orderDocs.slice().sort((a, b) => b.createdAtValue - a.createdAtValue);
  } else if (orderFuse) {
    const results = orderFuse.search(toNormalized(trimmed));
    results.forEach(({ item, score }) => {
      baseList.push(item);
      if (typeof score === 'number') {
        scores.set(item.id, score);
      }
    });
  }
  const filtered = filterOrders(baseList.length ? baseList : orderDocs, filters);
  return filtered.slice(0, 20).map((order, index) => ({
    id: order.id,
    domain: 'orders',
    title: `#${order.id}`,
    subtitle: order.itemText || order.status,
    route: `/orders/${order.id}`,
    metadata: {
      status: order.status,
      createdAt: order.createdAt,
    },
    score: scores.size
      ? toScoreFromFuse(scores.get(order.id), index)
      : 0.8 - index * 0.03,
  }));
}

function scoreMessage(doc: MessageDoc, queryText: string, index: number): number {
  const normalizedQuery = toNormalized(queryText);
  if (!normalizedQuery) {
    return 1 - Math.min(index * 0.02, 0.6);
  }
  const direct = doc.messageNormalized.includes(normalizedQuery) ? 0.6 : 0;
  const senderMatch = doc.senderNormalized.includes(normalizedQuery)
    ? 0.2
    : doc.threadNormalized.includes(normalizedQuery)
      ? 0.15
      : 0;
  const grams = generateNgrams(queryText);
  let gramScore = 0;
  if (grams.size > 0) {
    let hits = 0;
    grams.forEach((token) => {
      if (doc.tokens.has(token)) {
        hits += 1;
      }
    });
    gramScore = grams.size > 0 ? (hits / grams.size) * 0.4 : 0;
  }
  const total = direct + senderMatch + gramScore;
  return Math.max(0, Math.min(1, total));
}

function queryMessages(query: string, filters?: MessageFilters): SearchResult[] {
  const filtered = filterMessages(messageDocs, filters);
  if (!filtered.length) return [];
  const trimmed = query.trim();
  if (!trimmed) {
    return filtered
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map((doc, index) => ({
        id: doc.id,
        domain: 'messages',
        title: doc.threadName,
        subtitle: doc.message,
        route: '/messages',
        params: { threadId: doc.threadId },
        metadata: {
          sender: doc.senderName,
          timestamp: doc.timestamp,
        },
        score: 1 - Math.min(index * 0.02, 0.5),
      }));
  }

  const scored = filtered
    .map((doc, index) => ({ doc, score: scoreMessage(doc, trimmed, index) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.doc.timestamp - a.doc.timestamp;
    })
    .slice(0, 20);

  return scored.map(({ doc, score }) => ({
    id: doc.id,
    domain: 'messages',
    title: doc.threadName,
    subtitle: doc.message,
    route: '/messages',
    params: { threadId: doc.threadId },
    metadata: {
      sender: doc.senderName,
      timestamp: doc.timestamp,
    },
    score,
  }));
}

export const search = {
  index(payload: SearchIndexPayload) {
    scheduleIdle(() => {
      if (payload.products) {
        indexProducts(payload.products);
      }
      if (payload.stores) {
        indexStores(payload.stores);
      }
      if (payload.orders) {
        indexOrders(payload.orders);
      }
      if (payload.messages) {
        indexMessages(payload.messages);
      }
    });
  },
  query(
    queryText: string,
    options?: {
      domain?: SearchDomain;
      filters?: ProductFilters | StoreFilters | OrderFilters | MessageFilters;
    },
  ): SearchResult[] {
    const domain = options?.domain;
    if (domain === 'products') {
      return queryProducts(queryText, options?.filters as ProductFilters | undefined);
    }
    if (domain === 'stores') {
      return queryStores(queryText, options?.filters as StoreFilters | undefined);
    }
    if (domain === 'orders') {
      return queryOrders(queryText, options?.filters as OrderFilters | undefined);
    }
    if (domain === 'messages') {
      return queryMessages(queryText, options?.filters as MessageFilters | undefined);
    }

    const results: SearchResult[] = [];
    results.push(
      ...queryProducts(queryText, options?.filters as ProductFilters | undefined),
      ...queryStores(queryText, options?.filters as StoreFilters | undefined),
      ...queryOrders(queryText, options?.filters as OrderFilters | undefined),
      ...queryMessages(queryText, options?.filters as MessageFilters | undefined),
    );
    return results
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);
  },
};

export default search;
