import { selectProduct } from '@/agents/products-agent';
import type { Product } from '@/types';
import DatabaseService from '@/services/database';
import { prefetchStoreBundle } from '@/features/stores/services/prefetch';
import { push } from '@/hooks/navigation';
import { errorLog } from '@/utils/logger';

interface ProductCache {
  getById(id: string): Product | undefined;
}

let productsWarmCache: ProductCache | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@/features/products/services/nearProducts');
  if (mod && typeof mod === 'object' && 'productsWarmCache' in mod) {
    productsWarmCache = mod.productsWarmCache as ProductCache;
  }
} catch {
  productsWarmCache = null;
}

function resolveStoreIdFromCache(productId: string): string | null {
  if (!productsWarmCache) return null;
  try {
    const cached = productsWarmCache.getById(productId);
    if (cached?.storeId) {
      return cached.storeId;
    }
  } catch (err) {
    errorLog('Failed to read product cache', err);
  }
  return null;
}

async function resolveStoreId(productId: string): Promise<string | null> {
  const fromCache = resolveStoreIdFromCache(productId);
  if (fromCache) return fromCache;

  try {
    const product = await selectProduct(productId);
    if (product?.storeId) {
      return product.storeId;
    }
  } catch (err) {
    errorLog('Failed to load product via agent', err);
  }

  try {
    const db = DatabaseService.getInstance();
    const local = await db.getProduct(productId);
    if (local?.storeId) {
      return local.storeId;
    }
  } catch (err) {
    errorLog('Failed to resolve product from local database', err);
  }

  return null;
}

export async function openProduct(productId: string): Promise<string> {
  const id = productId?.trim();
  if (!id) {
    throw new Error('INVALID_PRODUCT_ID');
  }

  const storeId = await resolveStoreId(id);
  if (!storeId) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  const path = `/store/${encodeURIComponent(storeId)}/product/${encodeURIComponent(id)}`;
  try {
    void prefetchStoreBundle(storeId);
  } catch (err) {
    errorLog('Failed to prefetch store bundle for product navigation', err);
  }
  push(path);
  return path;
}

export default openProduct;
