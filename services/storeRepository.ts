import { EventEmitter } from 'events';
import type { Store } from '@/types';

import type { StoreListStream } from '@/features/stores/services/nearStores';

type NearStoresModule = typeof import('@/features/stores/services/nearStores');
type StoreService = ReturnType<NearStoresModule['createStoreService']>;

let nearStoresModule: NearStoresModule | null = null;
let storeService: StoreService | null = null;

async function getStoreService(): Promise<StoreService> {
  if (!nearStoresModule) {
    nearStoresModule = await import('@/features/stores/services/nearStores');
  }
  if (!storeService) {
    const deps = nearStoresModule.createDefaultStoreServiceDeps();
    storeService = nearStoresModule.createStoreService(deps);
  }
  return storeService;
}

export type StoreRepositoryEventMap = {
  'store.created': { store: Store; namespace: string; previous: Store | null };
  'store.updated': { store: Store; namespace: string; previous: Store | null };
  'store.removed': { id: string; namespace: string; store: Store | null };
};

type StoreRepositoryEvent = keyof StoreRepositoryEventMap;

type StoreRepositoryListener<T extends StoreRepositoryEvent> = (
  payload: StoreRepositoryEventMap[T],
) => void;

function cloneStore(store: Store): Store {
  return { ...store };
}

export interface SaveStoreResult {
  store: Store;
  namespace: string;
  previous: Store | null;
  created: boolean;
}

export class StoreRepository {
  private emitter = new EventEmitter();

  constructor() {
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

  async save(store: Store): Promise<SaveStoreResult> {
    const service = await getStoreService();
    const record = this.toRecord(store);
    const namespace = this.getNamespace(record);
    let previous: Store | null = null;
    try {
      previous = await service.selectStore(namespace, record.id);
    } catch {}

    if (previous) {
      const previousRecord = cloneStore(previous);
      await service.updateStore(record, namespace);
      this.emit('store.updated', { store: record, namespace, previous: previousRecord });
      return { store: record, namespace, previous: previousRecord, created: false };
    }

    await service.addStore(record, namespace);
    this.emit('store.created', { store: record, namespace, previous: null });
    return { store: record, namespace, previous: null, created: true };
  }

  async remove(id: string): Promise<{ id: string; namespace: string; store: Store | null } | null> {
    const service = await getStoreService();
    let existing: Store | null = null;
    try {
      existing = await service.selectStore(id);
    } catch {}
    if (!existing) return null;
    const namespace = this.getNamespace(existing);
    const snapshot = cloneStore(existing);
    await service.removeStore(namespace, id);
    this.emit('store.removed', { id, namespace, store: snapshot });
    return { id, namespace, store: snapshot };
  }

  async select(id: string): Promise<Store | null> {
    const service = await getStoreService();
    const store = await service.selectStore(id);
    return store ? cloneStore(store) : null;
  }

  async selectInNamespace(namespace: string, id: string): Promise<Store | null> {
    const service = await getStoreService();
    const store = await service.selectStore(namespace, id);
    return store ? cloneStore(store) : null;
  }

  private async resolveList(namespace: string): Promise<StoreListStream> {
    const service = await getStoreService();
    return service.listStores(namespace);
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

export const storeRepository = new StoreRepository();

export const saveStore = (store: Store) => storeRepository.save(store);
export const removeStore = (id: string) => storeRepository.remove(id);
export const selectStore = (id: string) => storeRepository.select(id);
export const listStores = (namespace?: string) => storeRepository.list(namespace);
export const findStoreByOwner = (owner: string) => storeRepository.findByOwner(owner);

export default storeRepository;
