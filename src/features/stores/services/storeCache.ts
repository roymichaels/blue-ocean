import type { Store } from '@/types';
import { requireStoreId } from '@/vendor/blue-ocean-utils';
import { canonicalJson } from '@/utils/serialization';
import { listValues, setValue } from '@/services/nearKvStore';
import {
  createWarmCache,
  type CacheMutation,
  type DiffMessage,
  type WarmCache,
} from '@/services/warmCache';
import { errorLog } from '@/utils/logger';

const STORE_CACHE_TOPIC = '/blue-ocean/stores/1';
export const STORE_CACHE_ADDRESS = 'stores';

export type StoreCacheHydrator = () => Promise<Array<DiffMessage<Store>>>;

export interface StoreCacheDeps {
  topic?: string;
  address?: string;
  warmCacheFactory?: (
    topic: string,
    options: { hydrateLake: StoreCacheHydrator },
  ) => WarmCache<Store>;
  listValues?: typeof listValues;
  setValue?: typeof setValue;
  requireStoreId?: typeof requireStoreId;
  canonicalJson?: typeof canonicalJson;
  errorLog?: typeof errorLog;
  loadSeedData?: () => Promise<{ stores?: Store[] } | null>;
}

export interface StoreCacheRepository {
  get(id: string): Store | undefined;
  list(filter?: (id: string, value: Store) => boolean): Store[];
  subscribe(
    filter: (id: string, value: Store | undefined) => boolean,
    cb: (id: string, value: Store | undefined) => void,
  ): () => void;
  mutate(cmd: CacheMutation<Store>): DiffMessage<Store> | null;
  onSynced(cb: (event?: { cache: string }) => void): () => void;
}

interface ResolvedStoreCacheDeps {
  topic: string;
  address: string;
  warmCacheFactory: (
    topic: string,
    options: { hydrateLake: StoreCacheHydrator },
  ) => WarmCache<Store>;
  listValues: typeof listValues;
  setValue: typeof setValue;
  requireStoreId: typeof requireStoreId;
  canonicalJson: typeof canonicalJson;
  errorLog: typeof errorLog;
  loadSeedData: () => Promise<{ stores?: Store[] } | null>;
}

function defaultLoadSeedData(): Promise<{ stores?: Store[] } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('@/assets/seed/seed-data.json');
    return Promise.resolve((data ?? null) as { stores?: Store[] } | null);
  } catch {
    return Promise.resolve(null);
  }
}

const defaultDeps: ResolvedStoreCacheDeps = {
  topic: STORE_CACHE_TOPIC,
  address: STORE_CACHE_ADDRESS,
  warmCacheFactory: createWarmCache,
  listValues,
  setValue,
  requireStoreId,
  canonicalJson,
  errorLog,
  loadSeedData: defaultLoadSeedData,
};

function resolveStoreCacheDeps(deps?: StoreCacheDeps): ResolvedStoreCacheDeps {
  if (!deps) return defaultDeps;
  return {
    topic: deps.topic ?? defaultDeps.topic,
    address: deps.address ?? defaultDeps.address,
    warmCacheFactory: deps.warmCacheFactory ?? defaultDeps.warmCacheFactory,
    listValues: deps.listValues ?? defaultDeps.listValues,
    setValue: deps.setValue ?? defaultDeps.setValue,
    requireStoreId: deps.requireStoreId ?? defaultDeps.requireStoreId,
    canonicalJson: deps.canonicalJson ?? defaultDeps.canonicalJson,
    errorLog: deps.errorLog ?? defaultDeps.errorLog,
    loadSeedData: deps.loadSeedData ?? defaultDeps.loadSeedData,
  };
}

function makeStoreCacheKey(address: string, storeId: string, sid: string): string {
  return `${address}:${sid}:${storeId}`;
}

function makeStoreCacheIndexKey(address: string, storeId: string): string {
  return `${address}:default:${storeId}`;
}

export function storeCacheKey(storeId: string, sid: string): string {
  return makeStoreCacheKey(STORE_CACHE_ADDRESS, storeId, sid);
}

export function storeCacheIndexKey(storeId: string): string {
  return makeStoreCacheIndexKey(STORE_CACHE_ADDRESS, storeId);
}

export class StoreCache implements StoreCacheRepository {
  private readonly warmCache: WarmCache<Store>;

  private readonly deps: ResolvedStoreCacheDeps;

  private seeded = false;

  private seedPromise: Promise<void> | null = null;

  private seedingEnabled = false;

  constructor(deps?: StoreCacheDeps) {
    this.deps = resolveStoreCacheDeps(deps);
    this.warmCache = this.deps.warmCacheFactory(this.deps.topic, {
      hydrateLake: this.hydrateStoreLake,
    });
  }

  private hydrateStoreLake: StoreCacheHydrator = async () => {
    try {
      const entries = await this.deps.listValues(this.deps.address);
      const seen = new Map<string, DiffMessage<Store>>();
      for (const entry of entries) {
        try {
          const parsed = JSON.parse(entry.value) as Store & {
            rev?: number;
            version?: number;
          };
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
          const diff: DiffMessage<Store> = {
            id,
            rev,
            op: 'set',
            value: parsed,
            ts,
          };
          if (!seen.has(id) || entry.key.includes(`:${id}`)) {
            seen.set(id, diff);
          }
        } catch (err) {
          this.deps.errorLog('Invalid store snapshot', err);
        }
      }
      return Array.from(seen.values());
    } catch (err) {
      this.deps.errorLog('Failed to hydrate stores from NEAR Lake', err);
      return [];
    }
  };

  private async runSeed(): Promise<void> {
    try {
      const data = await this.deps.loadSeedData();
      const stores = Array.isArray(data?.stores) ? (data?.stores as Store[]) : [];
      await Promise.all(
        stores.map(async (store) => {
          const sid = this.deps.requireStoreId(store.id);
          const json = this.deps.canonicalJson(store);
          await this.deps.setValue(
            this.deps.address,
            makeStoreCacheKey(this.deps.address, store.id, sid),
            json,
          );
          await this.deps.setValue(
            this.deps.address,
            makeStoreCacheIndexKey(this.deps.address, store.id),
            json,
          );
        }),
      );
    } catch (err) {
      this.deps.errorLog('Failed to seed store cache', err);
    } finally {
      this.seeded = true;
    }
  }

  private maybeSeed(): void {
    if (!this.seedingEnabled || this.seeded || this.seedPromise) {
      return;
    }
    this.seedPromise = this.runSeed()
      .catch(() => {})
      .finally(() => {
        this.seedPromise = null;
      });
  }

  async seed(): Promise<void> {
    if (this.seeded && !this.seedPromise) {
      return;
    }
    if (!this.seedPromise) {
      this.seedPromise = this.runSeed()
        .catch(() => {})
        .finally(() => {
          this.seedPromise = null;
        });
    }
    await this.seedPromise;
  }

  setSeedEnabled(enabled: boolean): void {
    this.seedingEnabled = enabled;
    if (!enabled) {
      this.seeded = false;
      this.seedPromise = null;
      return;
    }
    this.maybeSeed();
  }

  get(id: string): Store | undefined {
    this.maybeSeed();
    return this.warmCache.getById(id);
  }

  list(filter?: (id: string, value: Store) => boolean): Store[] {
    this.maybeSeed();
    return this.warmCache.list(filter);
  }

  subscribe(
    filter: (id: string, value: Store | undefined) => boolean,
    cb: (id: string, value: Store | undefined) => void,
  ): () => void {
    this.maybeSeed();
    return this.warmCache.subscribe(filter, cb);
  }

  mutate(cmd: CacheMutation<Store>): DiffMessage<Store> | null {
    return this.warmCache.mutate(cmd);
  }

  onSynced(cb: (event?: { cache: string }) => void): () => void {
    return this.warmCache.onSynced(cb);
  }
}

export function createStoreCache(deps?: StoreCacheDeps): StoreCache {
  return new StoreCache(deps);
}

const defaultStoreCache = new StoreCache();

export const storeCacheRepository: StoreCacheRepository = defaultStoreCache;

export async function seedStoreCache(): Promise<void> {
  await defaultStoreCache.seed();
}

export function setStoreCacheSeedEnabled(enabled: boolean): void {
  defaultStoreCache.setSeedEnabled(enabled);
}

export { STORE_CACHE_TOPIC };
