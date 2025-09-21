const listeners: Record<string, Array<(payload: any) => void>> = {};

type StoreRepositoryMock = {
  on: jest.Mock<() => void, [string, (payload: any) => void]>;
  select: jest.Mock;
  save: jest.Mock;
  findByOwner: jest.Mock;
  list: jest.Mock;
  remove: jest.Mock;
  emit: (event: string, payload: any) => void;
};

function createStoreRepositoryMock(): StoreRepositoryMock {
  return {
    on: jest.fn((event: string, cb: (payload: any) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event]!.push(cb);
      return () => {
        listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
      };
    }),
    select: jest.fn(),
    save: jest.fn(),
    findByOwner: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
    emit: (event: string, payload: any) => {
      (listeners[event] || []).forEach((cb) => cb(payload));
    },
  };
}

let storeRepositoryMock: StoreRepositoryMock;

const loadStoresAgent = () => {
  jest.resetModules();
  jest.doMock('@/services/storeRepository', () => {
    storeRepositoryMock = createStoreRepositoryMock();
    return {
      __esModule: true,
      default: storeRepositoryMock,
    };
  });
  let agent: typeof import('../agents/stores-agent').default;
  jest.isolateModules(() => {
    agent = require('../agents/stores-agent').default;
  });
  if (!storeRepositoryMock) {
    throw new Error('store repository mock not initialized');
  }
  return { storesAgent: agent!, storeRepository: storeRepositoryMock };
};

describe('storesAgent reputation integration', () => {
  const baseStore = {
    id: 'store-1',
    name: 'Store One',
    owner: 'owner-1',
    nftId: 'nft-1',
    reputation: 0,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(listeners).forEach((event) => {
      listeners[event] = [];
    });
  });

  it('persists review scores and notifies subscribers', async () => {
    const { storesAgent, storeRepository } = loadStoresAgent();
    storeRepository.select.mockResolvedValue({ ...baseStore });
    storeRepository.save.mockResolvedValue({
      store: { ...baseStore, reputation: 3.4 },
      namespace: 'default',
      previous: baseStore,
      created: false,
      diff: {
        op: 'update',
        id: baseStore.id,
        namespace: 'default',
        store: { ...baseStore, reputation: 3.4 },
        previous: baseStore,
        cacheDiff: null,
      },
    });

    const callback = jest.fn();
    storesAgent.subscribe(callback);

    await storesAgent.recordReview(baseStore.id, 4);

    expect(storeRepository.save).toHaveBeenCalledWith({
      ...baseStore,
      reputation: 2,
    });
    expect(callback).toHaveBeenCalledWith(baseStore.id, 3.4, expect.any(Object));
    expect(storesAgent.getReputationScore(baseStore.id)).toBeCloseTo(3.4);
  });

  it('rolls back failed review updates', async () => {
    const { storesAgent, storeRepository } = loadStoresAgent();
    storeRepository.select.mockResolvedValue({ ...baseStore });
    storeRepository.save.mockRejectedValue(new Error('network error'));

    const callback = jest.fn();
    storesAgent.subscribe(callback);

    await storesAgent.recordReview(baseStore.id, 5);

    expect(callback).not.toHaveBeenCalled();
    expect(storesAgent.getReputationScore(baseStore.id)).toBe(0);
  });

  it('updates reliability by owner and restores on failure', async () => {
    const { storesAgent, storeRepository } = loadStoresAgent();
    storeRepository.findByOwner.mockResolvedValue({ ...baseStore });
    storeRepository.save.mockResolvedValue({
      store: { ...baseStore, reputation: 3 },
      namespace: 'default',
      previous: baseStore,
      created: false,
      diff: {
        op: 'update',
        id: baseStore.id,
        namespace: 'default',
        store: { ...baseStore, reputation: 3 },
        previous: baseStore,
        cacheDiff: null,
      },
    });

    const callback = jest.fn();
    storesAgent.subscribe(callback);

    await storesAgent.updateReputationByOwner(baseStore.owner, 0.6);

    expect(storeRepository.save).toHaveBeenCalledWith({
      ...baseStore,
      reputation: 1.5,
    });
    expect(callback).toHaveBeenCalledWith(baseStore.id, 3, expect.any(Object));
    expect(storesAgent.getReputationScore(baseStore.id)).toBeCloseTo(3);

    storeRepository.save.mockRejectedValueOnce(new Error('write failed'));
    await storesAgent.updateReputationByOwner(baseStore.owner, 0.2);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(storesAgent.getReputationScore(baseStore.id)).toBeCloseTo(3);
  });
});
