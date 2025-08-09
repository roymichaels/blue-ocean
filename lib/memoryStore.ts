import type { User, Product, Order, TenantSettings, Notification, Store } from '../types';

export interface MemoryStore {
  users: User[];
  products: Product[];
  stores: Store[];
  orders: Order[];
  notifications: Notification[];
  tenantSettings: Record<string, TenantSettings>;
}

export const store: MemoryStore = {
  users: [],
  products: [],
  stores: [],
  orders: [],
  notifications: [],
  tenantSettings: {},
};
