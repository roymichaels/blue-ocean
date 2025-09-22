import { EventEmitter } from 'events';
import type { Store } from '@/types';

import type { StoreListStream } from './nearStores';
import type { DiffMessage } from '@/services/warmCache';

type NearStoresModule = typeof import('./nearStores');
type StoreService = ReturnType<NearStoresModule['createStoreService']>;

export type StoreRepositoryEventMap = {
  'store.created': { store: Store; namespace: string; previous: Store | null };
  'store.updated': { store: Store; namespace: string; previous: Store | null };
  'store.removed': { id: string; namespace: string; store: Store | null };
  'store.diff': StoreRepositoryDiff;
};

export type StoreRepositoryDiffBase = {
  id: string;
  namespace: string;
  cacheDiff: DiffMessage<Store> | null;
};

export type StoreRepositoryDiff =
  | (StoreRepositoryDiffBase & {
      op: 'create';
      store: Store;
      previous: null;
    })
  | (StoreRepositoryDiffBase & {
      op: 'update';
      store: Store;
      previous: Store;
    })
  | (StoreRepositoryDiffBase & {
      op: 'remove';
      store: null;
      previous: Store | null;
    });

export interface SaveStoreResult {
  store: Store;
  namespace: string;
  previous: Store | null;
  created: boolean;
  diff: StoreRepositoryDiff;
}

export interface StoreRepositoryDeps {
  getStoreService: () => Promise<StoreService>;
}

type StoreRepositoryEvent = keyof StoreRepositoryEventMap;

type StoreRepositoryListener<T extends StoreRepositoryEvent> = (
  payload: StoreRepositoryEventMap[T],
) => void;

function cloneStore(store: Store): Store {
  return { ...store };
}

export class StoreRepository {
  private readonly emitter = new EventEmitter();

  private storeServicePromise: Promise<StoreService> | null = null;

  constructor(private readonly deps: StoreRepositoryDeps) {
    this.emitter.setMaxListeners(this.emitter.getMaxListeners() + 10);
  }

  private toRecord(store: Store): Store {
    const { id, name, owner, nftId, reputation = 0, plan, createdAt } = store;
    return {
      id,
      name,
      owner,
      nftId,
      reputation,
      plan,
      createdAt,
    } as Store;
  }

  private getNamespace(store: Store): string {
    const owner = typeof store.owner === 'string' ? store.owner.trim() : '';
    return owner || 'default';
  }

  private emit<T extends StoreRepositoryEvent>(
    event: T,
    payload: StoreRepositoryEventMap[T],
  ): void {
    this.emitter.emit(event, payload);
  }

  private emitDiff(diff: StoreRepositoryDiff): void {
    this.emit('store.diff', diff);
  }

  private async getStoreService(): Promise<StoreService> {
    if (!this.storeServicePromise) {
      this.storeServicePromise = this.deps.getStoreService();
    }
    return this.storeServicePromise;
  }

  on<T extends StoreRepositoryEvent>(
    event: T,
    listener: StoreRepositoryListener<T>,
  ): () => void {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return () => {
      this.emitter.off(event, listener as (...args: unknown[]) => void);
    };
  }

  once<T extends StoreRepositoryEvent>(
    event: T,
    listener: StoreRepositoryListener<T>,
  ): () => void {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return () => {
      this.emitter.off(event, listener as (...args: unknown[]) => void);
    };
  }

  private async resolveList(namespace: string): Promise<StoreListStream> {
    const service = await this.getStoreService();
    return service.listStores(namespace);
  }

  async save(store: Store): Promise<SaveStoreResult> {
    const service = await this.getStoreService();
    const record = this.toRecord(store);
    const namespace = this.getNamespace(record);
    let previous: Store | null = null;
    try {
      previous = await service.selectStore(namespace, record.id);
    } catch {}

    if (previous) {
      const previousRecord = cloneStore(previous);
      const cacheDiff = await service.updateStore(record, namespace);
      const diff: StoreRepositoryDiff = {
        op: 'update',
        id: record.id,
        namespace,
        store: record,
        previous: previousRecord,
        cacheDiff: cacheDiff ?? null,
      };
      this.emit('store.updated', { store: record, namespace, previous: previousRecord });
      this.emitDiff(diff);
      return { store: record, namespace, previous: previousRecord, created: false, diff };
    }

    const cacheDiff = await service.addStore(record, namespace);
    const diff: StoreRepositoryDiff = {
      op: 'create',
      id: record.id,
      namespace,
      store: record,
      previous: null,
      cacheDiff: cacheDiff ?? null,
    };
    this.emit('store.created', { store: record, namespace, previous: null });
    this.emitDiff(diff);
    return { store: record, namespace, previous: null, created: true, diff };
  }

  async remove(id: string): Promise<StoreRepositoryDiff | null> {
    const service = await this.getStoreService();
    let existing: Store | null = null;
    try {
      existing = await service.selectStore(id);
    } catch {}
    if (!existing) return null;
    const namespace = this.getNamespace(existing);
    const snapshot = cloneStore(existing);
    const cacheDiff = await service.removeStore(namespace, id);
    const diff: StoreRepositoryDiff = {
      op: 'remove',
      id,
      namespace,
      store: null,
      previous: snapshot,
      cacheDiff: cacheDiff ?? null,
    };
    this.emit('store.removed', { id, namespace, store: snapshot });
    this.emitDiff(diff);
    return diff;
  }

  async select(id: string): Promise<Store | null> {
    const service = await this.getStoreService();
    const store = await service.selectStore(id);
    return store ? cloneStore(store) : null;
  }

  async selectInNamespace(namespace: string, id: string): Promise<Store | null> {
    const service = await this.getStoreService();
    const store = await service.selectStore(namespace, id);
    return store ? cloneStore(store) : null;
  }

  async list(namespace = 'default'): Promise<Store[]> {
    const stream = await this.resolveList(namespace);
    let list = stream.getSnapshot();
    if (list.length === 0) {
      list = await stream.read();
    }
    return list.map(cloneStore);
  }

  async findByOwner(owner: string): Promise<Store | null> {
    const stores = await this.list('default');
    const store = stores.find((s) => s.owner === owner);
    return store ? cloneStore(store) : null;
  }
}

export function createDefaultStoreRepositoryDeps(): StoreRepositoryDeps {
  let modulePromise: Promise<NearStoresModule> | null = null;
  let servicePromise: Promise<StoreService> | null = null;
  return {
    async getStoreService() {
      if (!servicePromise) {
        if (!modulePromise) {
          modulePromise = import('./nearStores');
        }
        servicePromise = (async () => {
          const mod = await modulePromise!;
          const deps = mod.createDefaultStoreServiceDeps();
          return mod.createStoreService(deps);
        })();
      }
      return servicePromise;
    },
  };
}

export function createStoreRepository(
  deps: StoreRepositoryDeps = createDefaultStoreRepositoryDeps(),
): StoreRepository {
  return new StoreRepository(deps);
}

export const storeRepository = createStoreRepository();

export type { StoreRepositoryEventMap };
export default storeRepository;
