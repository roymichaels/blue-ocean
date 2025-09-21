import type { Store } from '@/types';
import { StoreRepository } from '@/features/stores/services/storeRepository';
import type { StoreListStream } from '@/features/stores/services/nearStores';
import type { DiffMessage } from '@/services/warmCache';

type StoreServiceStub = {
  selectStore: jest.Mock<Promise<Store | null>, [string, string?]>;
  listStores: jest.Mock<StoreListStream, [string]>;
  addStore: jest.Mock<Promise<DiffMessage<Store> | null>, [Store, string?]>;
  updateStore: jest.Mock<Promise<DiffMessage<Store> | null>, [Store, string?]>;
  removeStore: jest.Mock<Promise<DiffMessage<Store> | null>, [string, string?]>;
};

function createStream(stores: Store[]): StoreListStream {
  return {
    async read() {
      return stores;
    },
    getSnapshot() {
      return [];
    },
    subscribe: () => () => undefined,
    onError: () => () => undefined,
    async *[Symbol.asyncIterator]() {
      yield stores;
    },
  };
}

function createRepository() {
  const service: StoreServiceStub = {
    selectStore: jest.fn(),
    listStores: jest.fn(),
    addStore: jest.fn(),
    updateStore: jest.fn(),
    removeStore: jest.fn(),
  };
  const repo = new StoreRepository({
    getStoreService: async () => service as unknown as any,
  });
  return { repo, service };
}

describe('StoreRepository', () => {
  const baseStore: Store = {
    id: 'store-1',
    name: 'Alpha',
    owner: 'owner.near',
    nftId: 'nft-1',
    reputation: 2,
  } as Store;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates new stores and emits diff events', async () => {
    const { repo, service } = createRepository();
    service.selectStore.mockResolvedValueOnce(null);
    const cacheDiff = { id: 'store-1', op: 'set', rev: 1 } as DiffMessage<Store>;
    service.addStore.mockResolvedValueOnce(cacheDiff);
    const createdListener = jest.fn();
    const diffListener = jest.fn();
    repo.on('store.created', createdListener);
    repo.on('store.diff', diffListener);

    const result = await repo.save(baseStore);

    expect(service.selectStore).toHaveBeenCalledWith('owner.near', 'store-1');
    expect(service.addStore).toHaveBeenCalledWith(expect.objectContaining({ id: 'store-1' }), 'owner.near');
    expect(result.created).toBe(true);
    expect(result.namespace).toBe('owner.near');
    expect(result.diff.cacheDiff).toBe(cacheDiff);
    expect(createdListener).toHaveBeenCalledWith({ store: expect.any(Object), namespace: 'owner.near', previous: null });
    expect(diffListener).toHaveBeenCalledWith(expect.objectContaining({ op: 'create', id: 'store-1' }));
  });

  it('updates existing stores and emits change events', async () => {
    const { repo, service } = createRepository();
    const existing = { ...baseStore, reputation: 1 } as Store;
    service.selectStore.mockResolvedValueOnce(existing);
    const cacheDiff = { id: 'store-1', op: 'set', rev: 2 } as DiffMessage<Store>;
    service.updateStore.mockResolvedValueOnce(cacheDiff);
    const updatedListener = jest.fn();
    repo.on('store.updated', updatedListener);

    const result = await repo.save({ ...baseStore, reputation: 4 });

    expect(service.selectStore).toHaveBeenCalledWith('owner.near', 'store-1');
    expect(service.updateStore).toHaveBeenCalledWith(expect.objectContaining({ reputation: 4 }), 'owner.near');
    expect(result.created).toBe(false);
    expect(result.previous).toEqual(existing);
    expect(result.diff.cacheDiff).toBe(cacheDiff);
    expect(updatedListener).toHaveBeenCalledWith({ store: expect.any(Object), namespace: 'owner.near', previous: existing });
  });

  it('removes stores and emits removal diffs', async () => {
    const { repo, service } = createRepository();
    service.selectStore.mockResolvedValueOnce(baseStore);
    const cacheDiff = { id: 'store-1', op: 'delete', rev: 3 } as DiffMessage<Store>;
    service.removeStore.mockResolvedValueOnce(cacheDiff);
    const removedListener = jest.fn();
    repo.on('store.removed', removedListener);

    const diff = await repo.remove('store-1');

    expect(service.selectStore).toHaveBeenCalledWith('store-1');
    expect(service.removeStore).toHaveBeenCalledWith('owner.near', 'store-1');
    expect(diff?.cacheDiff).toBe(cacheDiff);
    expect(removedListener).toHaveBeenCalledWith({ id: 'store-1', namespace: 'owner.near', store: expect.any(Object) });
  });

  it('returns defensive copies for select', async () => {
    const { repo, service } = createRepository();
    const snapshot = { ...baseStore, plan: 'pro' } as Store;
    service.selectStore.mockResolvedValueOnce(snapshot);

    const store = await repo.select('store-1');

    expect(store).toEqual(snapshot);
    expect(store).not.toBe(snapshot);
  });

  it('lists stores via service streams', async () => {
    const { repo, service } = createRepository();
    const stores = [{ ...baseStore }, { ...baseStore, id: 'store-2' }];
    service.listStores.mockReturnValueOnce(createStream(stores));

    const result = await repo.list('default');

    expect(service.listStores).toHaveBeenCalledWith('default');
    expect(result).toEqual(stores);
    expect(result[0]).not.toBe(stores[0]);
  });
});
