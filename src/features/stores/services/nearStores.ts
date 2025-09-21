import type { Store } from '@/types';
import { requireStoreId } from '@blue-ocean/utils';
import { canonicalJson } from '@/utils/serialization';
import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { errorLog } from '@/utils/logger';
import {
  createDefaultStoreServiceDeps,
  type StoreServiceDeps,
} from './storeServiceDeps';
import type { MintStoreResult } from './storeChainClient';
import {
  STORE_CACHE_ADDRESS,
  storeCacheRepository,
  storeCacheIndexKey,
  storeCacheKey,
} from './storeCache';
import type { DiffMessage } from '@/services/warmCache';

const defaultDeps = createDefaultStoreServiceDeps();

function resolveDeps(deps?: StoreServiceDeps): StoreServiceDeps {
  return deps ?? defaultDeps;
}

type StoreListener = (stores: ReadonlyArray<Store>) => void;
type StoreErrorListener = (error: unknown) => void;

export interface StoreListStream {
  read(): Promise<ReadonlyArray<Store>>;
  getSnapshot(): ReadonlyArray<Store>;
  subscribe(listener: StoreListener): () => void;
  onError(listener: StoreErrorListener): () => void;
  [Symbol.asyncIterator](): AsyncIterator<ReadonlyArray<Store>>;
}

export const storesWarmCache = {
  getById(id: string) {
    return storeCacheRepository.get(id);
  },
  list(filter?: (id: string, value: Store) => boolean) {
    return storeCacheRepository.list(filter);
  },
  subscribe(
    filter: (id: string, value: Store | undefined) => boolean,
    cb: (id: string, value: Store | undefined) => void,
  ) {
    return storeCacheRepository.subscribe(filter, cb);
  },
  mutate(cmd: Parameters<typeof storeCacheRepository.mutate>[0]) {
    return storeCacheRepository.mutate(cmd);
  },
  onSynced(cb: (event?: { cache: string }) => void) {
    return storeCacheRepository.onSynced(cb);
  },
};

function fromChain(data: any): Store {
  return {
    id: data.id ?? data.store_id ?? '',
    name: data.name ?? '',
    owner: data.owner_id ?? data.owner ?? '',
    nftId: data.nft_id ?? data.nftId ?? '',
    reputation:
      typeof data.reputation === 'string'
        ? Number(data.reputation)
        : data.reputation,
  } as Store;
}

export async function mintStore(
  name: string,
  deps?: StoreServiceDeps,
): Promise<MintStoreResult> {
  const resolved = resolveDeps(deps);
  return resolved.storeChainClient.mintStore(name);
}

async function persistStore(store: Store, sid: string): Promise<DiffMessage<Store> | null> {
  const json = canonicalJson(store);
  await setValue(STORE_CACHE_ADDRESS, storeCacheKey(store.id, sid), json);
  await setValue(STORE_CACHE_ADDRESS, storeCacheIndexKey(store.id), json);
  let diff: DiffMessage<Store> | null = null;
  try {
    diff = storeCacheRepository.mutate({ id: store.id, value: store }) ?? null;
  } catch {}
  return diff;
}

export function selectStore(
  arg1: string,
  deps?: StoreServiceDeps,
): Promise<Store | null>;
export function selectStore(
  arg1: string,
  arg2: string,
  deps?: StoreServiceDeps,
): Promise<Store | null>;
export async function selectStore(
  arg1: string,
  arg2OrDeps?: string | StoreServiceDeps,
  maybeDeps?: StoreServiceDeps,
): Promise<Store | null> {
  const id = typeof arg2OrDeps === 'string' ? arg2OrDeps : arg1;
  const deps =
    (typeof arg2OrDeps === 'object' && arg2OrDeps)
      ? arg2OrDeps
      : maybeDeps;
  resolveDeps(deps);
  try {
    const cached = storeCacheRepository.get(id);
    if (cached) return cached;
  } catch {}
  const key =
    typeof arg2OrDeps === 'string'
      ? storeCacheKey(id, requireStoreId(arg1))
      : storeCacheIndexKey(id);
  const res = await getValue(STORE_CACHE_ADDRESS, key);
  if (!res) return null;
  try {
    return JSON.parse(res) as Store;
  } catch (err) {
    errorLog('Invalid store data', err);
    return null;
  }
}
const storeStreams = new WeakMap<StoreServiceDeps, Map<string, StoreListStream>>();
const chainSyncTasks = new WeakMap<StoreServiceDeps, Promise<void>>();

function scheduleChainSync(deps: StoreServiceDeps): void {
  if (chainSyncTasks.has(deps)) return;
  const task = (async () => {
    try {
      try {
        deps.chain.assertNearChain();
      } catch {
        return;
      }
      const chainRes = await deps.contract.listStores();
      const mapped = chainRes.map(fromChain);
      await Promise.all(
        mapped.map(async (store) => {
          try {
            await persistStore(store, requireStoreId(store.id));
          } catch (err) {
            errorLog('Failed to persist store from chain sync', err);
          }
        }),
      );
    } catch (err) {
      errorLog('Failed to sync stores from chain', err);
    } finally {
      chainSyncTasks.delete(deps);
    }
  })();
  chainSyncTasks.set(deps, task);
}

function createStoreListStream(
  storeId: string,
  deps: StoreServiceDeps,
): StoreListStream {
  const sid = requireStoreId(storeId);
  const listeners = new Set<StoreListener>();
  const errorListeners = new Set<StoreErrorListener>();
  const state = new Map<string, Store>();
  let current: ReadonlyArray<Store> = [];
  let hasValue = false;

  function cloneStore(store: Store): Store {
    return { ...store };
  }

  function emitError(err: unknown) {
    for (const listener of errorListeners) {
      try {
        listener(err);
      } catch {}
    }
  }

  function snapshot(): ReadonlyArray<Store> {
    return Array.from(state.values());
  }

  function notify() {
    const value = snapshot();
    current = value;
    hasValue = true;
    for (const listener of listeners) {
      try {
        listener(value);
      } catch (err) {
        emitError(err);
      }
    }
  }

  function replaceState(list: Store[]) {
    state.clear();
    for (const item of list) {
      if (!item || typeof item.id !== 'string' || item.id.length === 0) continue;
      state.set(item.id, cloneStore(item));
    }
    notify();
  }

  const filter = (id: string, value: Store | undefined) => {
    if (sid === 'default') return true;
    if (value) return requireStoreId(value.id) === sid;
    return state.has(id);
  };

  try {
    storeCacheRepository.subscribe(filter, (id, value) => {
      if (value) {
        state.set(id, cloneStore(value));
      } else if (!state.has(id)) {
        return;
      } else {
        state.delete(id);
      }
      notify();
    });
  } catch (err) {
    emitError(err);
  }

  (async () => {
    try {
      const cached = storeCacheRepository.list((id, value) => filter(id, value));
      replaceState(cached);
    } catch {
      // ignore cache hydration errors
    }
    if (state.size === 0) {
      try {
        const items = await listValues(STORE_CACHE_ADDRESS);
        const res: Store[] = [];
        const specificPrefix = `${STORE_CACHE_ADDRESS}:${sid}:`;
        for (const item of items) {
          if (sid !== 'default' && !item.key.startsWith(specificPrefix)) continue;
          if (sid === 'default' && !item.key.startsWith(`${STORE_CACHE_ADDRESS}:default:`)) continue;
          try {
            const parsed = JSON.parse(item.value) as Store;
            if (sid !== 'default' && requireStoreId(parsed.id) !== sid) continue;
            res.push(parsed);
          } catch (err) {
            errorLog('Invalid store data', err);
          }
        }
        if (res.length > 0) {
          replaceState(res);
        }
      } catch (err) {
        errorLog('Failed to load stores from KV', err);
      }
    }
    if (!hasValue) {
      replaceState([]);
    }
  })().catch((err) => emitError(err));

  scheduleChainSync(deps);

  return {
    async read() {
      if (hasValue) return current;
      return new Promise<ReadonlyArray<Store>>((resolve, reject) => {
        let unsub: (() => void) | null = null;
        let offError: (() => void) | null = null;
        const handleValue = (value: ReadonlyArray<Store>) => {
          if (unsub) unsub();
          if (offError) offError();
          resolve(value);
        };
        const handleError = (err: unknown) => {
          if (unsub) unsub();
          if (offError) offError();
          reject(err);
        };
        unsub = this.subscribe(handleValue);
        offError = this.onError(handleError);
      });
    },
    getSnapshot() {
      return current;
    },
    subscribe(listener: StoreListener) {
      listeners.add(listener);
      if (hasValue) {
        try {
          listener(current);
        } catch (err) {
          emitError(err);
        }
      }
      return () => {
        listeners.delete(listener);
      };
    },
    onError(listener: StoreErrorListener) {
      errorListeners.add(listener);
      return () => {
        errorListeners.delete(listener);
      };
    },
    [Symbol.asyncIterator]() {
      let done = false;
      const queue: ReadonlyArray<Store>[] = [];
      const pending: Array<{
        resolve: (value: IteratorResult<ReadonlyArray<Store>>) => void;
        reject: (reason?: unknown) => void;
      }> = [];

      const push = (value: ReadonlyArray<Store>) => {
        if (pending.length > 0) {
          const waiter = pending.shift();
          waiter?.resolve({ value, done: false });
          return;
        }
        queue.length = 0;
        queue.push(value);
      };

      const fail = (err: unknown) => {
        while (pending.length > 0) {
          const waiter = pending.shift();
          waiter?.reject(err);
        }
      };

      const stop = () => {
        if (done) return;
        done = true;
        valueUnsub();
        errorUnsub();
      };

      const valueUnsub = this.subscribe((value) => {
        push(value);
      });
      const errorUnsub = this.onError((err) => {
        fail(err);
      });

      return {
        next: () => {
          if (done) return Promise.resolve({ value: undefined, done: true });
          if (queue.length > 0) {
            const value = queue.shift()!;
            return Promise.resolve({ value, done: false });
          }
          return new Promise<IteratorResult<ReadonlyArray<Store>>>((resolve, reject) => {
            pending.push({ resolve, reject });
          });
        },
        return: () => {
          stop();
          return Promise.resolve({ value: undefined, done: true });
        },
        throw: (err?: unknown) => {
          stop();
          return Promise.reject(err);
        },
      };
    },
  };
}

export function listStores(storeId: string, deps?: StoreServiceDeps): StoreListStream {
  const resolved = resolveDeps(deps);
  const sid = requireStoreId(storeId);
  let perDeps = storeStreams.get(resolved);
  if (!perDeps) {
    perDeps = new Map();
    storeStreams.set(resolved, perDeps);
  }
  let stream = perDeps.get(sid);
  if (!stream) {
    stream = createStoreListStream(sid, resolved);
    perDeps.set(sid, stream);
  }
  scheduleChainSync(resolved);
  return stream;
}

export async function addStore(
  store: Store,
  sid?: string,
  deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null> {
  const resolved = resolveDeps(deps);
  await resolved.storeChainClient.submitMutation('add', { store });
  return persistStore(store, sid ?? requireStoreId(store.id));
}

export async function updateStore(
  store: Store,
  sid?: string,
  deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null> {
  const resolved = resolveDeps(deps);
  await resolved.storeChainClient.submitMutation('update', { store });
  return persistStore(store, sid ?? requireStoreId(store.id));
}

export function removeStore(
  id: string,
  deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null>;
export function removeStore(
  arg1: string,
  arg2: string,
  deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null>;
export async function removeStore(
  arg1: string,
  arg2OrDeps?: string | StoreServiceDeps,
  maybeDeps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null> {
  const id = typeof arg2OrDeps === 'string' ? arg2OrDeps : arg1;
  const sid =
    typeof arg2OrDeps === 'string'
      ? requireStoreId(arg1)
      : requireStoreId(id);
  const deps =
    (typeof arg2OrDeps === 'object' && arg2OrDeps)
      ? arg2OrDeps
      : maybeDeps;
  const resolved = resolveDeps(deps);
  await resolved.storeChainClient.submitMutation('remove', { id });
  await removeValue(STORE_CACHE_ADDRESS, storeCacheKey(id, sid));
  await removeValue(STORE_CACHE_ADDRESS, storeCacheIndexKey(id));
  let diff: DiffMessage<Store> | null = null;
  try {
    diff = storeCacheRepository.mutate({ id, op: 'delete' }) ?? null;
  } catch {}
  return diff;
}

export const getStore = selectStore;

export async function setStore(
  storeId: string,
  store: Store,
  deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null> {
  const resolved = resolveDeps(deps);
  const existing = await selectStore(storeId, store.id, resolved);
  if (existing) {
    return updateStore(store, storeId, resolved);
  }
  return addStore(store, storeId, resolved);
}

export function createStoreService(
  deps: StoreServiceDeps = defaultDeps,
): {
  mintStore: (name: string) => Promise<MintStoreResult>;
  selectStore: (arg1: string, arg2?: string) => Promise<Store | null>;
  listStores: (storeId: string) => StoreListStream;
  addStore: (store: Store, sid?: string) => Promise<DiffMessage<Store> | null>;
  updateStore: (store: Store, sid?: string) => Promise<DiffMessage<Store> | null>;
  removeStore: (arg1: string, arg2?: string) => Promise<DiffMessage<Store> | null>;
  setStore: (storeId: string, store: Store) => Promise<DiffMessage<Store> | null>;
  createStoreOnChain: (args: { id: string; name: string; owner: string }) => Promise<string>;
} {
  const resolved = resolveDeps(deps);
  return {
    mintStore: (name: string) => mintStore(name, resolved),
    selectStore: (arg1: string, arg2?: string) =>
      typeof arg2 === 'string'
        ? selectStore(arg1, arg2, resolved)
        : selectStore(arg1, resolved),
    listStores: (storeId: string) => listStores(storeId, resolved),
    addStore: (store: Store, sid?: string) => addStore(store, sid, resolved),
    updateStore: (store: Store, sid?: string) => updateStore(store, sid, resolved),
    removeStore: (arg1: string, arg2?: string) =>
      typeof arg2 === 'string'
        ? removeStore(arg1, arg2, resolved)
        : removeStore(arg1, resolved),
    setStore: (storeId: string, store: Store) => setStore(storeId, store, resolved),
    createStoreOnChain: (args: { id: string; name: string; owner: string }) =>
      createStoreOnChain(args, resolved),
  };
}

/**
 * Submit a meta-tx to the relayer to create a store on NEAR.
 * Requires EXPO_PUBLIC_RELAYER_URL and wallet connected (public key present).
 * Returns transaction hash if the relayer reports success.
 */
export async function createStoreOnChain(args: {
  id: string;
  name: string;
  owner: string;
}, deps?: StoreServiceDeps): Promise<string> {
  const resolved = resolveDeps(deps);
  return resolved.storeChainClient.createStoreOnChain(args);
}

export { createDefaultStoreServiceDeps } from './storeServiceDeps';
export { seedStoreCache, setStoreCacheSeedEnabled } from './storeCache';
export type { MintStoreResult } from './storeChainClient';






