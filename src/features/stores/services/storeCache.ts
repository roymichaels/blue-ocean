import type { Store } from '@/types';
import { requireStoreId } from '@blue-ocean/utils';
import { canonicalJson } from '@/utils/serialization';
import { listValues, setValue } from '@/services/nearKvStore';
import {
  createWarmCache,
  type CacheMutation,
  type DiffMessage,
} from '@/services/warmCache';
import { errorLog } from '@/utils/logger';

const STORE_CACHE_TOPIC = '/blue-ocean/stores/1';
export const STORE_CACHE_ADDRESS = 'stores';

let seedingEnabled = false;
let seeded = false;
let seedPromise: Promise<void> | null = null;

function storeCacheKey(storeId: string, sid: string): string {
  return `${STORE_CACHE_ADDRESS}:${sid}:${storeId}`;
}

function storeCacheIndexKey(storeId: string): string {
  return `${STORE_CACHE_ADDRESS}:default:${storeId}`;
}

async function hydrateStoreLake(): Promise<Array<DiffMessage<Store>>> {
  try {
    const entries = await listValues(STORE_CACHE_ADDRESS);
    const seen = new Map<string, DiffMessage<Store>>();
    for (const entry of entries) {
      try {
        const parsed = JSON.parse(entry.value) as Store & { rev?: number; version?: number };
        const keyParts = entry.key.split(':');
        const id = parsed.id || keyParts[keyParts.length - 1] || entry.key;
        if (!id) continue;
        const tsSource =
          (parsed.updatedAt && new Date(parsed.updatedAt).getTime()) ||
          (parsed.createdAt && new Date(parsed.createdAt).getTime()) ||
          Date.now();
        const ts = Number.isFinite(tsSource) ? tsSource : Date.now();
        const rev =
          (typeof parsed.rev === 'number' && parsed.rev) ||
          (typeof parsed.version === 'number' && parsed.version) ||
          1;
        const diff: DiffMessage<Store> = { id, rev, op: 'set', value: parsed, ts };
        if (!seen.has(id) || entry.key.includes(`:${id}`)) {
          seen.set(id, diff);
        }
      } catch (err) {
        errorLog('Invalid store snapshot', err);
      }
    }
    return Array.from(seen.values());
  } catch (err) {
    errorLog('Failed to hydrate stores from NEAR Lake', err);
    return [];
  }
}

const warmCache = createWarmCache<Store>(STORE_CACHE_TOPIC, {
  hydrateLake: hydrateStoreLake,
});

async function runSeed(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('@/assets/seed/seed-data.json');
    const stores = Array.isArray(data?.stores) ? (data.stores as Store[]) : [];
    await Promise.all(
      stores.map(async (store) => {
        const sid = requireStoreId(store.id);
        const json = canonicalJson(store);
        await setValue(STORE_CACHE_ADDRESS, storeCacheKey(store.id, sid), json);
        await setValue(STORE_CACHE_ADDRESS, storeCacheIndexKey(store.id), json);
      }),
    );
  } catch (err) {
    errorLog('Failed to seed store cache', err);
  } finally {
    seeded = true;
  }
}

function maybeSeed() {
  if (!seedingEnabled || seeded || seedPromise) return;
  seedPromise = runSeed()
    .catch(() => {})
    .finally(() => {
      seedPromise = null;
    });
}

export async function seedStoreCache(): Promise<void> {
  if (seeded && !seedPromise) return;
  if (!seedPromise) {
    seedPromise = runSeed()
      .catch(() => {})
      .finally(() => {
        seedPromise = null;
      });
  }
  await seedPromise;
}

export function setStoreCacheSeedEnabled(enabled: boolean) {
  seedingEnabled = enabled;
  if (!enabled) {
    seeded = false;
    seedPromise = null;
    return;
  }
  maybeSeed();
}

export interface StoreCacheRepository {
  get(id: string): Store | undefined;
  list(filter?: (id: string, value: Store) => boolean): Store[];
  subscribe(
    filter: (id: string, value: Store | undefined) => boolean,
    cb: (id: string, value: Store | undefined) => void,
  ): () => void;
  mutate(cmd: CacheMutation<Store>): void;
  onSynced(cb: (event?: { cache: string }) => void): () => void;
}

export const storeCacheRepository: StoreCacheRepository = {
  get(id: string) {
    maybeSeed();
    return warmCache.getById(id);
  },
  list(filter) {
    maybeSeed();
    return warmCache.list(filter);
  },
  subscribe(filter, cb) {
    maybeSeed();
    return warmCache.subscribe(filter, cb);
  },
  mutate(cmd) {
    return warmCache.mutate(cmd);
  },
  onSynced(cb) {
    return warmCache.onSynced(cb);
  },
};

export { storeCacheKey, storeCacheIndexKey };
