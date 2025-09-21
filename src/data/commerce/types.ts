import type { AppMode } from '@/application/types';

export type CurrencyCode = 'USD' | 'EUR' | 'USDC';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  heroImage: string;
  price: Money;
  rating: number;
  ratingCount: number;
  deliveryEstimateMinutes: number;
  isNew?: boolean;
  tags: string[];
}

export interface Store {
  id: string;
  name: string;
  tagline: string;
  heroImage: string;
  rating: number;
  distanceMinutes: number;
  categories: string[];
  openNow: boolean;
  featuredProductIds: string[];
}

export type OrderStatus = 'processing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: Money;
}

export interface Order {
  id: string;
  placedAt: string;
  status: OrderStatus;
  total: Money;
  items: OrderItem[];
  fulfillmentEtaMinutes?: number;
}

export interface MessagePreview {
  id: string;
  storeId: string;
  storeName: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
}

export interface CommerceFeed {
  heroStore: Store;
  featuredStores: Store[];
  trendingProducts: Product[];
  quickCategories: string[];
}

export interface CommerceSearchResult {
  stores: Store[];
  products: Product[];
}

export interface CommerceClientOptions {
  mode: AppMode;
  baseUrl?: string;
}

export interface CommerceClient {
  readonly mode: AppMode;
  getFeed(): Promise<CommerceFeed>;
  getStores(): Promise<Store[]>;
  getOrders(): Promise<Order[]>;
  getMessages(): Promise<MessagePreview[]>;
  search(term: string): Promise<CommerceSearchResult>;
}

export type BundleInsight = {
  label: string;
  value: string;
  description: string;
};
