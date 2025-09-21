import type { Store } from '@/types';
import {
  StoreCache,
  createStoreCache,
  STORE_CACHE_ADDRESS,
  storeCacheKey,
  storeCacheIndexKey,
  type StoreCacheHydrator,
} from '@/features/stores/services/storeCache';

function createWarmCacheStub() {
  const stub = {
    getById: jest.fn(),
    list: jest.fn(() => [] as Store[]),
    subscribe: jest.fn(() => () => undefined),
    mutate: jest.fn(() => null),
    onSynced: jest.fn(() => () => undefined),
  };
  let hydrator: StoreCacheHydrator | null = null;
  const factory = jest.fn((_topic: string, options: { hydrateLake: StoreCacheHydrator }) => {
    hydrator = options.hydrateLake;
    return stub;
  });
  return { stub, factory, getHydrator: () => hydrator };
}

describe('StoreCache', () => {
  it('hydrates diff messages from persisted snapshots', async () => {
    const warmCache = createWarmCacheStub();
    const listValues = jest.fn().mockResolvedValue([
      {
        key: `${STORE_CACHE_ADDRESS}:default:store-1`,
        value: JSON.stringify({ id: 'store-1', name: 'Primary', rev: 3, updatedAt: '2024-01-01T00:00:00Z' }),
      },
      {
        key: `${STORE_CACHE_ADDRESS}:tenant:store-1`,
        value: JSON.stringify({ id: 'store-1', name: 'Override', version: 5 }),
      },
      {
        key: `${STORE_CACHE_ADDRESS}:default:store-2`,
        value: '{ invalid json',
      },
      {
        key: `${STORE_CACHE_ADDRESS}:default:store-3`,
        value: JSON.stringify({ name: 'Fallback Store', createdAt: '2024-02-02T00:00:00Z' }),
      },
    ]);
    const errorLog = jest.fn();
    const cache = createStoreCache({
      warmCacheFactory: warmCache.factory,
      listValues,
      setValue: jest.fn(),
      errorLog,
      loadSeedData: jest.fn().mockResolvedValue(null),
      canonicalJson: JSON.stringify,
      requireStoreId: (value: string) => value,
    });
    const hydrator = warmCache.getHydrator();
    expect(cache).toBeInstanceOf(StoreCache);
    if (!hydrator) throw new Error('hydrateLake not captured');

    const diffs = await hydrator();

    expect(diffs).toHaveLength(2);
    const storeOne = diffs.find((diff) => diff.id === 'store-1');
    expect(storeOne?.value).toMatchObject({ name: 'Override' });
    expect(storeOne?.rev).toBe(5);
    const storeThree = diffs.find((diff) => diff.id === 'store-3');
    expect(storeThree?.value).toMatchObject({ name: 'Fallback Store' });
    expect(storeThree?.rev).toBe(1);
    expect(errorLog).toHaveBeenCalledWith('Invalid store snapshot', expect.any(SyntaxError));
  });

  it('persists seed data when requested', async () => {
    const warmCache = createWarmCacheStub();
    const setValue = jest.fn().mockResolvedValue(undefined);
    const requireStoreId = jest.fn((value: string) => value.toLowerCase());
    const canonicalJson = jest.fn((value: Store) => JSON.stringify(value));
    const cache = createStoreCache({
      warmCacheFactory: warmCache.factory,
      listValues: jest.fn().mockResolvedValue([]),
      setValue,
      requireStoreId,
      canonicalJson,
      loadSeedData: jest.fn().mockResolvedValue({
        stores: [
          { id: 'Store-Alpha', name: 'Alpha', owner: 'alice.near' } as Store,
        ],
      }),
    });

    await cache.seed();

    expect(requireStoreId).toHaveBeenCalledWith('Store-Alpha');
    expect(canonicalJson).toHaveBeenCalledWith({
      id: 'Store-Alpha',
      name: 'Alpha',
      owner: 'alice.near',
    });
    expect(setValue).toHaveBeenNthCalledWith(
      1,
      STORE_CACHE_ADDRESS,
      storeCacheKey('Store-Alpha', 'store-alpha'),
      JSON.stringify({ id: 'Store-Alpha', name: 'Alpha', owner: 'alice.near' }),
    );
    expect(setValue).toHaveBeenNthCalledWith(
      2,
      STORE_CACHE_ADDRESS,
      storeCacheIndexKey('Store-Alpha'),
      JSON.stringify({ id: 'Store-Alpha', name: 'Alpha', owner: 'alice.near' }),
    );
  });
});
