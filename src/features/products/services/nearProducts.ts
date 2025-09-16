import { getValue, setValue, listValues, removeValue } from '@/services/nearKvStore';
import { Product } from '@/types';
import { assertNearChain } from '@/services/chain';
import { requireStoreId } from '@blue-ocean/utils';
import { errorLog } from '@/utils/logger';
import { productSchema } from '@/schemas/waku';
import { canonicalJson } from '@/utils/serialization';
import { createWarmCache } from '@/services/warmCache';
import type { CacheMutation, DiffMessage } from '@/services/warmCache';

assertNearChain();

const ADDRESS = 'products';
const PRODUCT_CACHE_TOPIC = '/blue-ocean/products/1';
async function hydrateProductLake(): Promise<Array<DiffMessage<Product>>> {
  try {
    const entries = await listValues(ADDRESS);
    const diffs: Array<DiffMessage<Product>> = [];
    for (const entry of entries) {
      if (!entry.key.startsWith(`${ADDRESS}:`)) continue;
      const parts = entry.key.split(':');
      const id = parts[parts.length - 1] || entry.key;
      if (!id) continue;
      try {
        const parsed = productSchema.parse(JSON.parse(entry.value));
        const normalized: Product = {
          ...parsed,
          pricingTier: parsed.pricingTier,
          variants: parsed.variants || [],
          colors: parsed.colors || [],
        };
        const tsSource =
          (normalized.updatedAt && new Date(normalized.updatedAt).getTime()) ||
          (normalized.createdAt && new Date(normalized.createdAt).getTime()) ||
          Date.now();
        const ts = Number.isFinite(tsSource) ? tsSource : Date.now();
        const rev =
          (typeof (normalized as any).rev === 'number' && (normalized as any).rev) ||
          (typeof (normalized as any).version === 'number' && (normalized as any).version) ||
          1;
        diffs.push({ id: normalized.id || id, rev, op: 'set', value: normalized, ts });
      } catch (err) {
        errorLog('Invalid product snapshot', err);
      }
    }
    return diffs;
  } catch (err) {
    errorLog('Failed to hydrate products from NEAR Lake', err);
    return [];
  }
}

const productCache = createWarmCache<Product>(PRODUCT_CACHE_TOPIC, {
  hydrateLake: hydrateProductLake,
});

export const productsWarmCache = {
  getById(id: string) {
    return productCache.getById(id);
  },
  list(filter?: (id: string, value: Product) => boolean) {
    return productCache.list(filter);
  },
  subscribe(
    filter: (id: string, value: Product | undefined) => boolean,
    cb: (id: string, value: Product | undefined) => void,
  ) {
    return productCache.subscribe(filter, cb);
  },
  mutate(cmd: CacheMutation<Product>) {
    return productCache.mutate(cmd);
  },
  onSynced(cb: (event?: { cache: string }) => void) {
    return productCache.onSynced(cb);
  },
};
const DISABLED = false;
let SEEDED = false;

function ensureSeed() {
  if (!DISABLED || SEEDED) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('@/assets/seed/seed-data.json');
    if (data?.products) {
      for (const p of data.products as Product[]) {
        void setValue(ADDRESS, `${ADDRESS}:${p.storeId}:${p.id}`, canonicalJson({
          ...p,
          pricingTier: p.pricingTier,
          variants: p.variants || [],
          colors: p.colors || [],
        }));
      }
    }
  } catch {}
  SEEDED = true;
}

export async function getProduct(storeId: string, id: string): Promise<Product | null> {
  ensureSeed();
  try {
    const cached = productCache.getById(id);
    if (cached) return cached;
  } catch {}
  const sid = requireStoreId(storeId);
  const res = await getValue(ADDRESS, `${ADDRESS}:${sid}:${id}`);
  if (!res) return null;
  try {
    const parsed = productSchema.parse(JSON.parse(res));
    return {
      ...parsed,
      pricingTier: parsed.pricingTier,
      variants: parsed.variants || [],
      colors: parsed.colors || [],
    };
  } catch (err) {
    errorLog('Invalid product data', err);
    return null;
  }
}

export async function setProduct(storeId: string, product: Product) {
  const sid = requireStoreId(storeId);
  const validated = productSchema.parse(product);
  await setValue(
    ADDRESS,
    `${ADDRESS}:${sid}:${validated.id}`,
    canonicalJson({
      ...validated,
      pricingTier: validated.pricingTier,
      variants: validated.variants || [],
      colors: validated.colors || [],
    })
  );
}

export async function removeProduct(storeId: string, id: string) {
  const sid = requireStoreId(storeId);
  await removeValue(ADDRESS, `${ADDRESS}:${sid}:${id}`);
}
export async function listProducts(storeId: string): Promise<Product[]> {
  ensureSeed();
  const sid = requireStoreId(storeId);
  try {
    const cached = productCache.list((id, p) => p.storeId === sid);
    if (cached.length > 0) return cached;
  } catch {}
  const items = await listValues(ADDRESS);
  const res: Product[] = [];
  for (const i of items) {
    if (!i.key.startsWith(`${ADDRESS}:${sid}:`)) continue;
    try {
      const parsed = productSchema.parse(JSON.parse(i.value));
      res.push({
        ...parsed,
        pricingTier: parsed.pricingTier,
        variants: parsed.variants || [],
        colors: parsed.colors || [],
      });
    } catch (err) {
      errorLog('Invalid product in list', err);
    }
  }
  return res;
}

export async function getProducts(storeId: string, ids: string[]): Promise<Product[]> {
  const sid = requireStoreId(storeId);
  const res: Product[] = [];
  for (const id of ids) {
    const prod = await getProduct(sid, id);
    if (prod) res.push(prod);
  }
  return res;
}

export async function setProductBatch(storeId: string, products: Product[]) {
  const sid = requireStoreId(storeId);
  for (const p of products) {
    const validated = productSchema.parse(p);
    await setProduct(sid, validated);
  }
}

export async function estimateSetProductBatch(products: Product[]): Promise<number> {
  const payload = products.map(p => canonicalJson(p)).join('');
  return payload.length;
}

export async function getVersion(): Promise<number> {
  return 0;
}
