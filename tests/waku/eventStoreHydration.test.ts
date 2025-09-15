import { EventStore, SnapshotEntry } from 'src/data/store';

class MemoryStore {
  private readonly map = new Map<string, string>();

  async read(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async write(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }

  entries(): [string, string][] {
    return Array.from(this.map.entries());
  }
}

describe('EventStore hydration', () => {
  function createStore(
    overrides: ConstructorParameters<typeof EventStore>[0] = {},
  ) {
    const topic = '/blueocean/testnet/store-1/orders';
    const snapshots = [
      {
        key: 'orders:store-1:o1',
        value: JSON.stringify({ id: 'o1', status: 'snapshot', rev: 1 }),
      },
    ];
    const historyByTopic = new Map<string, any[]>([
      [
        topic,
        [
          { id: 'o1', rev: 2, value: { id: 'o1', status: 'paid' }, ts: 5 },
          { id: 'o2', rev: 1, value: { id: 'o2', status: 'pending' }, ts: 6 },
        ],
      ],
    ]);

    const fetchHistory =
      overrides?.fetchHistory ??
      jest.fn(async (t: string, handler: (msg: unknown) => void) => {
        const items = historyByTopic.get(t) || [];
        for (const msg of items) handler(msg);
      });

    const listValues =
      overrides?.listValues ??
      jest.fn(async (address: string) => {
        if (address === 'orders') return snapshots;
        return [] as { key: string; value: string }[];
      });

    const liveHandlers = new Map<string, (msg: any) => void>();
    const subscribeMock =
      overrides?.subscribeWithAck ??
      jest.fn(async (t: string, handler: (msg: unknown) => void) => {
        liveHandlers.set(t, handler);
        return () => {};
      });

    const store = new EventStore({
      fetchHistory,
      listValues,
      subscribeWithAck: subscribeMock,
      storage: overrides?.storage,
      secretStorage: overrides?.secretStorage,
    });

    store.registerTopic({
      topic,
      address: 'orders',
      decodeSnapshot: (entry: SnapshotEntry) => {
        const parsed = JSON.parse(entry.value) as { id: string; rev?: number; status: string };
        return { id: parsed.id, value: parsed, rev: parsed.rev };
      },
      decodeMessage: (msg: unknown) => {
        const data = msg as { id?: string; rev?: number; value?: any; ts?: number } | null;
        if (!data || !data.id) return null;
        return { id: data.id, value: data.value ?? null, rev: data.rev, ts: data.ts };
      },
    });

    return { store, topic, fetchHistory, listValues, subscribeMock, liveHandlers };
  }

  it('hydrates snapshots, history, and live messages', async () => {
    const { store, topic, fetchHistory, listValues, subscribeMock, liveHandlers } = createStore({
      storage: new MemoryStore(),
    });

    store.ingest(topic, { id: 'o3', rev: 1, value: { id: 'o3', status: 'queued' } });

    const synced = new Promise<void>((resolve) => store.onSynced(topic, () => resolve()));

    await store.hydrate();
    await synced;

    expect(subscribeMock).toHaveBeenCalledWith(topic, expect.any(Function));
    expect(fetchHistory).toHaveBeenCalledWith(topic, expect.any(Function));
    expect(listValues).toHaveBeenCalledWith('orders');
    expect(store.isHydrated(topic)).toBe(true);

    expect(store.get<any>(topic, 'o1')?.status).toBe('paid');
    expect(store.get<any>(topic, 'o2')?.status).toBe('pending');
    expect(store.get<any>(topic, 'o3')?.status).toBe('queued');

    const handler = liveHandlers.get(topic);
    handler?.({ id: 'o1', rev: 1, value: { id: 'o1', status: 'older' } });
    expect(store.get<any>(topic, 'o1')?.status).toBe('paid');

    handler?.({ id: 'o1', rev: 3, value: { id: 'o1', status: 'fulfilled' }, ts: 7 });
    expect(store.get<any>(topic, 'o1')?.status).toBe('fulfilled');

    handler?.({ id: 'o2', rev: 2, value: null });
    expect(store.get<any>(topic, 'o2')).toBeUndefined();
  });

  it('persists encrypted state and restores from storage', async () => {
    const memory = new MemoryStore();
    const first = createStore({ storage: memory });

    await first.store.hydrate();
    for (let i = 0; i < 5 && memory.entries().length <= 1; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const persisted = memory
      .entries()
      .find(([key]) => key !== 'secret');
    expect(persisted).toBeDefined();
    const [, encrypted] = persisted!;
    expect(encrypted).toContain(':');
    expect(() => JSON.parse(encrypted)).toThrow();

    const emptyHistory = jest.fn(async () => {});
    const emptySnapshots = jest.fn(async () => []);
    const subscribeMock = jest.fn(async () => () => {});

    const second = createStore({
      fetchHistory: emptyHistory,
      listValues: emptySnapshots,
      subscribeWithAck: subscribeMock,
      storage: memory,
    });

    await second.store.hydrate();

    expect(second.store.get<any>(second.topic, 'o1')?.status).toBe('paid');
    expect(emptyHistory).toHaveBeenCalled();
    expect(emptySnapshots).toHaveBeenCalledWith('orders');
  });
});
