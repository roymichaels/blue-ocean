/* Lightweight prefetcher for store bundles (store + products + categories).
 * Starts network/kv reads ahead of navigation to reduce first render latency.
 */
import { getStore } from './nearStores';
import { listProducts } from '@/features/products/services/nearProducts';
import { listCategories } from '@/features/products/services/nearCategories';

type Entry = { ts: number; promise: Promise<void> };
const cache = new Map<string, Entry>();
const TTL_MS = 30000;

export function prefetchStoreBundle(storeId: string | null | undefined): Promise<void> {
  const id = (storeId || '').trim();
  if (!id) return Promise.resolve();
  const now = Date.now();
  const existing = cache.get(id);
  if (existing && now - existing.ts < TTL_MS) return existing.promise;

  const promise = (async () => {
    try {
      await Promise.allSettled([
        getStore(id, id),
        listProducts(id),
        listCategories(id),
      ]);
    } catch {
      // best-effort only
    }
  })();
  cache.set(id, { ts: now, promise });
  return promise;
}

export function prefetchFromPath(path: string | undefined | null) {
  if (!path || typeof path !== 'string') return;
  // Matches /store/<id> or /store/<id>/...
  const m = path.match(/^\/store\/([^\/?#]+)(?:[\/?#]|$)/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    // kick off prefetch, do not await
    void prefetchStoreBundle(id);
  }
}
