import type { User, Product, Order, TenantSettings, Notification } from '../types';

export interface MemoryStore {
  users: User[];
  products: Product[];
  orders: Order[];
  notifications: Notification[];
  tenantSettings: Record<string, TenantSettings>;
}

export const store: MemoryStore = {
  users: [],
  products: [],
  orders: [],
  notifications: [],
  tenantSettings: {},
};
