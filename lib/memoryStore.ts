import type { User, Product, Order, TenantSettings } from '../types';

export interface MemoryStore {
  users: User[];
  products: Product[];
  orders: Order[];
  tenantSettings: Record<string, TenantSettings>;
}

export const store: MemoryStore = {
  users: [],
  products: [],
  orders: [],
  tenantSettings: {},
};
