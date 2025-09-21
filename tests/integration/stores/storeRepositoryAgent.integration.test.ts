import type { Store } from '@/types';
import {
  StoreRepository,
  type StoreRepositoryDiff,
} from '@/features/stores/services/storeRepository';
import type { StoreListStream } from '@/features/stores/services/nearStores';
import type { DiffMessage } from '@/services/warmCache';
import { buildTopic } from '@/utils/wakuTopics';

type StoreServiceContract = {
  selectStore: (namespace: string, id?: string) => Promise<Store | null>;
  listStores: (namespace: string) => StoreListStream;
  addStore: (store: Store, namespace?: string) => Promise<DiffMessage<Store>>;
  updateStore: (store: Store, namespace?: string) => Promise<DiffMessage<Store>>;
  removeStore: (namespace: string, id?: string) => Promise<DiffMessage<Store>>;
};

class FakeStoreService implements StoreServiceContract {
  private readonly namespaces = new Map<string, Map<string, Store>>();

  private rev = 0;

  readonly diffs: DiffMessage<Store>[] = [];

  private clone(store: Store): Store {
    return { ...store };
  }

  private ensureNamespace(namespace: string): Map<string, Store> {
    let bucket = this.namespaces.get(namespace);
    if (!bucket) {
      bucket = new Map();
      this.namespaces.set(namespace, bucket);
    }
    return bucket;
  }

  private record(namespace: string, id: string, op: DiffMessage<Store>['op'], value?: Store) {
    const diff: DiffMessage<Store> = {
      id,
      rev: ++this.rev,
      op,
      value,
      ts: Date.now(),
    };
    this.diffs.push(diff);
    return diff;
  }

  private findById(id: string): { namespace: string; store: Store } | null {
    for (const [namespace, bucket] of this.namespaces) {
      const store = bucket.get(id);
      if (store) {
        return { namespace, store };
      }
    }
    return null;
  }

  async selectStore(arg1: string, maybeId?: string): Promise<Store | null> {
    if (typeof maybeId === 'string') {
      const bucket = this.namespaces.get(arg1);
      const store = bucket?.get(maybeId) ?? null;
      return store ? this.clone(store) : null;
    }
    const found = this.findById(arg1);
    return found ? this.clone(found.store) : null;
  }

  listStores(namespace: string): StoreListStream {
    const snapshot = () =>
      Array.from(this.namespaces.get(namespace)?.values() ?? []).map((store) => this.clone(store));
    return {
      async read() {
        return snapshot();
      },
      getSnapshot() {
        return snapshot();
      },
      subscribe: () => () => undefined,
      onError: () => () => undefined,
      async *[Symbol.asyncIterator]() {
        yield snapshot();
      },
    };
  }

  async addStore(store: Store, namespace = 'default'): Promise<DiffMessage<Store>> {
    const bucket = this.ensureNamespace(namespace);
    const copy = this.clone(store);
    bucket.set(store.id, copy);
    return this.record(namespace, store.id, 'set', this.clone(copy));
  }

  async updateStore(store: Store, namespace = 'default'): Promise<DiffMessage<Store>> {
    return this.addStore(store, namespace);
  }

  async removeStore(arg1: string, maybeId?: string): Promise<DiffMessage<Store>> {
    if (typeof maybeId === 'string') {
      const namespace = arg1;
      const id = maybeId;
      const bucket = this.namespaces.get(namespace);
      bucket?.delete(id);
      return this.record(namespace, id, 'delete');
    }
    const found = this.findById(arg1);
    if (found) {
      const { namespace, store } = found;
      this.namespaces.get(namespace)?.delete(store.id);
      return this.record(namespace, store.id, 'delete');
    }
    return this.record('default', arg1, 'delete');
  }

  peek(namespace: string, id: string): Store | null {
    const store = this.namespaces.get(namespace)?.get(id) ?? null;
    return store ? this.clone(store) : null;
  }
}

async function flushAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('StoresAgent + StoreRepository integration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function setup() {
    jest.resetModules();
    const service = new FakeStoreService();
    const repository = new StoreRepository({
      getStoreService: async () => service as unknown as any,
    });
    const publish = jest.fn().mockResolvedValue('waku-id');
    const makeSignedWakuMessage = jest
      .fn()
      .mockImplementation(async (type: string, payload: unknown, _scope: string, metadata: unknown) => ({
        type,
        payload,
        metadata,
      }));
    const ensureWallet = jest
      .fn()
      .mockResolvedValue({ address: 'owner.near', publicKey: 'pk.test' });

    jest.doMock('@/services/storeRepository', () => ({
      __esModule: true,
      default: repository,
      storeRepository: repository,
      StoreRepository,
    }));
    jest.doMock('@/services/waku', () => ({ publish }));
    jest.doMock('@/utils/wakuSigning', () => ({ makeSignedWakuMessage }));
    jest.doMock('@/utils/ensureNearWallet', () => ({ __esModule: true, default: ensureWallet }));

    let storesAgent: typeof import('@/agents/stores-agent').default;
    jest.isolateModules(() => {
      storesAgent = require('@/agents/stores-agent').default;
    });

    const diffs: StoreRepositoryDiff[] = [];
    repository.on('store.diff', (diff) => {
      diffs.push(diff);
    });

    return { storesAgent: storesAgent!, repository, service, publish, makeSignedWakuMessage, ensureWallet, diffs };
  }

  it('emits Waku events and syncs cache on create/update/remove flows', async () => {
    const { storesAgent, repository, service, publish, makeSignedWakuMessage, diffs } = setup();
    const baseStore: Store = {
      id: 'store-1',
      name: 'Alpha',
      owner: 'owner.near',
      nftId: 'nft-1',
      reputation: 0,
    } as Store;

    await storesAgent.add(baseStore);
    await flushAsync();

    expect(publish).toHaveBeenCalledWith(
      buildTopic('stores', '1'),
      expect.objectContaining({ type: 'store.created', payload: expect.objectContaining({ id: 'store-1' }) }),
    );
    expect(makeSignedWakuMessage).toHaveBeenCalledWith(
      'store.created',
      expect.objectContaining({ id: 'store-1' }),
      'store-owner',
      expect.objectContaining({ ts: expect.any(Number), nonce: expect.any(String) }),
    );
    expect(await repository.select('store-1')).toMatchObject({ name: 'Alpha' });
    expect(service.peek('owner.near', 'store-1')).toMatchObject({ name: 'Alpha' });

    publish.mockClear();
    makeSignedWakuMessage.mockClear();

    await storesAgent.update({ ...baseStore, name: 'Alpha Prime' });
    await flushAsync();

    expect(publish).toHaveBeenCalledWith(
      buildTopic('stores', '1'),
      expect.objectContaining({ type: 'store.updated', payload: expect.objectContaining({ name: 'Alpha Prime' }) }),
    );
    expect(makeSignedWakuMessage).toHaveBeenCalledWith(
      'store.updated',
      expect.objectContaining({ name: 'Alpha Prime' }),
      'store-owner',
      expect.objectContaining({ ts: expect.any(Number), nonce: expect.any(String) }),
    );
    expect(await repository.select('store-1')).toMatchObject({ name: 'Alpha Prime' });
    expect(service.peek('owner.near', 'store-1')).toMatchObject({ name: 'Alpha Prime' });

    publish.mockClear();
    makeSignedWakuMessage.mockClear();

    await storesAgent.remove('store-1');
    await flushAsync();

    expect(publish).toHaveBeenCalledWith(
      buildTopic('stores', '1'),
      expect.objectContaining({
        type: 'store.removed',
        payload: { id: 'store-1', store: expect.objectContaining({ name: 'Alpha Prime' }) },
      }),
    );
    expect(makeSignedWakuMessage).toHaveBeenCalledWith(
      'store.removed',
      { id: 'store-1', store: expect.objectContaining({ name: 'Alpha Prime' }) },
      'store-owner',
      expect.objectContaining({ ts: expect.any(Number), nonce: expect.any(String) }),
    );
    expect(await repository.select('store-1')).toBeNull();
    expect(service.peek('owner.near', 'store-1')).toBeNull();

    expect(diffs.map((diff) => diff.op)).toEqual(['create', 'update', 'remove']);
  });
});
