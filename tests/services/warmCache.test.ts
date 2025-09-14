import { createWarmCache, E_STALE_DATA, DiffMessage } from '@/services/warmCache';

const history: DiffMessage<any>[] = [
  { id: '1', rev: 1, op: 'set', value: { name: 'a' } },
  { id: '2', rev: 1, op: 'set', value: { name: 'b' } },
];

let liveHandler: ((msg: DiffMessage<any>) => void) | null = null;

jest.mock('@/services/waku', () => ({
  fetchHistory: jest.fn(async (_topic: string, cb: (m: DiffMessage<any>) => void) => {
    history.forEach(cb);
  }),
  subscribeWithAck: jest.fn(async (_topic: string, cb: (m: DiffMessage<any>) => void) => {
    liveHandler = cb;
    return () => {};
  }),
}));

describe('warmCache', () => {
  it('hydrates and applies diffs', async () => {
    const cache = createWarmCache<any>('topic');
    await new Promise((res) => cache.onSynced(res));
    expect(cache.getById('1')).toEqual({ name: 'a' });
    liveHandler && liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'a2' } });
    expect(cache.getById('1')).toEqual({ name: 'a2' });
  });

  it('detects stale data', async () => {
    const cache = createWarmCache<any>('topic');
    await new Promise((res) => cache.onSynced(res));
    liveHandler && liveHandler({ id: '1', rev: 4, op: 'set', value: { name: 'bad' } });
    expect(() => cache.getById('1')).toThrowErrorMatchingObject({ code: E_STALE_DATA });
  });
});
