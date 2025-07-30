import { store } from '../lib/memoryStore';
import { Product, User } from '../types';
import { getTenant, TENANT } from '../constants/tenant';
import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import { sendWakuProductUpdate } from '../lib/waku/sendWakuProductUpdate';
import { sendWakuSettingsUpdate } from '../lib/waku/sendWakuSettingsUpdate';
import { isWakuConfigured } from '../lib/waku/isWakuConfigured';

class DatabaseService {
  private static instance: DatabaseService;

  static get tenantId(): string {
    return TENANT;
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    const tenant = await getTenant();
    return Array.from(store.products.values()).filter(p => p.tenant_id === tenant);
  }

  async getProduct(id: string): Promise<Product | null> {
    return store.products.get(id) || null;
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    const id = `prod_${Date.now()}`;
    const tenant = await getTenant();
    const prod: Product = {
      ...product,
      id,
      tenant_id: tenant,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.products.set(id, prod);
    if (await isWakuConfigured()) {
      await sendWakuProductUpdate(prod);
    }
    return id;
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const existing = store.products.get(id);
    if (!existing) return;
    Object.assign(existing, product, { updatedAt: new Date().toISOString() });
    if (await isWakuConfigured()) {
      await sendWakuProductUpdate(existing);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    store.products.delete(id);
  }

  // Users
  async getUserProfile(userId: string): Promise<User | null> {
    return store.userProfiles.get(userId) || null;
  }

  async getAllUserProfiles(): Promise<User[]> {
    return Array.from(store.userProfiles.values());
  }

  async updateUserRole(userId: string, role: 'user' | 'driver' | 'admin'): Promise<void> {
    const user = store.userProfiles.get(userId);
    if (user) {
      user.role = role;
      user.updatedAt = new Date().toISOString();
      if (await isWakuConfigured()) {
        await sendWakuUserUpdate(user);
      }
    }
  }

  // Settings
  async getSetting(key: string): Promise<string | null> {
    return store.config.get(key) ?? null;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const createdAt = Date.now();
    store.config.set(key, value);
    if (await isWakuConfigured()) {
      await sendWakuSettingsUpdate(key, value, createdAt, createdAt);
    }
  }
}

export default DatabaseService;
