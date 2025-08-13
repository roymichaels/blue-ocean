import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  User,
  Product,
  Order,
  TenantSettings,
  Notification,
  Store,
} from '../types';

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

// Load seed data on first import if available
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, '../assets/seed/seed-data.json');
if (fs.existsSync(seedPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    store.users = data.users || [];
    store.products = data.products || [];
    store.stores = data.stores || [];
    store.orders = data.orders || [];
    store.notifications = data.notifications || [];
    store.tenantSettings = data.tenantSettings || {};
  } catch (err) {
    console.error('Failed to load seed data', err);
  }
}
