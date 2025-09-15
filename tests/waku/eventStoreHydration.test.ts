import { EventStore } from '@/data/store';

describe('EventStore hydration', () => {
  function createStore() {
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

    const fetchHistory = jest.fn(async (t: string, handler: (msg: unknown) => void) => {
      const items = historyByTopic.get(t) || [];
      for (const msg of items) handler(msg);
    });

    const listValues = jest.fn(async (address: string) => {
      if (address === 'orders') return snapshots;
      return [] as { key: string; value: string }[];
    });

    const store = new EventStore({ fetchHistory, listValues });
    store.registerTopic({
      topic,
      address: 'orders',
      decodeSnapshot: (entry) => {
        const parsed = JSON.parse(entry.value) as { id: string; rev?: number; status: string };
        return { id: parsed.id, value: parsed, rev: parsed.rev };
      },
      decodeMessage: (msg) => {
        const data = msg as { id?: string; rev?: number; value?: any; ts?: number } | null;
        if (!data || !data.id) return null;
        return { id: data.id, value: data.value ?? null, rev: data.rev, ts: data.ts };
      },
    });

    return { store, topic, fetchHistory, listValues };
  }

  it('hydrates snapshots and history before applying live messages', async () => {
    const { store, topic, fetchHistory, listValues } = createStore();

    store.ingest(topic, { id: 'o3', rev: 1, value: { id: 'o3', status: 'queued' } });

    await store.hydrate();

    expect(fetchHistory).toHaveBeenCalledWith(topic, expect.any(Function));
    expect(listValues).toHaveBeenCalledWith('orders');
    expect(store.isHydrated(topic)).toBe(true);

    expect(store.get<any>(topic, 'o1')?.status).toBe('paid');
    expect(store.get<any>(topic, 'o2')?.status).toBe('pending');
    expect(store.get<any>(topic, 'o3')?.status).toBe('queued');

    store.ingest(topic, { id: 'o1', rev: 1, value: { id: 'o1', status: 'older' } });
    expect(store.get<any>(topic, 'o1')?.status).toBe('paid');

    store.ingest(topic, { id: 'o2', rev: 2, value: null });
    expect(store.get<any>(topic, 'o2')).toBeUndefined();
  });
});
