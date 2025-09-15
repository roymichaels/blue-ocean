import type { DiffMessage } from '@/services/warmCache';

let createWarmCache: any;
let E_STALE_DATA: string;
let getCacheHitRatio: (topic: string) => number;

let history: DiffMessage<any>[] = [];
let liveHandler: ((msg: DiffMessage<any>) => void) | null = null;
let failHistory = false;

jest.mock('@/services/waku', () => ({
  fetchHistory: jest.fn(
    async (_topic: string, cb: (m: DiffMessage<any>) => void) => {
      if (failHistory) throw new Error('history failure');
      history.forEach(cb);
    },
  ),
  subscribeWithAck: jest.fn(
    async (_topic: string, cb: (m: DiffMessage<any>) => void) => {
      liveHandler = cb;
      return () => {};
    },
  ),
}));

beforeEach(() => {
  process.env.EXPO_PUBLIC_WARM_CACHE = 'true';
  delete process.env.EXPO_PUBLIC_WARM_CACHE_CANARY_ADMINS;
  delete process.env.EXPO_PUBLIC_WARM_CACHE_ROLLBACK;
  jest.resetModules();
  ({ createWarmCache, E_STALE_DATA, getCacheHitRatio } = require('@/services/warmCache'));
  history = [
    { id: '1', rev: 1, op: 'set', value: { name: 'a' } },
    { id: '2', rev: 1, op: 'set', value: { name: 'b' } },
  ];
  liveHandler = null;
  failHistory = false;
});

describe('warmCache', () => {
  it('warm boot matches cold boot results', async () => {
    const warm = createWarmCache<any>('topic');
    await new Promise((res) => warm.onSynced(res));
    // apply live diff
    liveHandler &&
      liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'a2' } });
    expect(warm.getById('1')).toEqual({ name: 'a2' });

    // cold boot from combined history
    history.push({ id: '1', rev: 2, op: 'set', value: { name: 'a2' } });
    const cold = createWarmCache<any>('topic');
    await new Promise((res) => cold.onSynced(res));
    expect(cold.getById('1')).toEqual({ name: 'a2' });
    expect(cold.getById('2')).toEqual({ name: 'b' });
  });

  it('detects conflicting diffs', async () => {
    const cache = createWarmCache<any>('topic');
    await new Promise((res) => cache.onSynced(res));
    liveHandler &&
      liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'a2' } });
    expect(cache.getById('1')).toEqual({ name: 'a2' });
    // duplicate revision triggers stale state
    liveHandler &&
      liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'bad' } });
    expect(() => cache.getById('1')).toThrowErrorMatchingObject({
      code: E_STALE_DATA,
    });
  });

  it('throws on out-of-order diff', async () => {
    const cache = createWarmCache<any>('topic');
    await new Promise((res) => cache.onSynced(res));
    liveHandler &&
      liveHandler({ id: '1', rev: 4, op: 'set', value: { name: 'bad' } });
    expect(() => cache.getById('1')).toThrowErrorMatchingObject({
      code: E_STALE_DATA,
    });
  });

  it('falls back when history fails', async () => {
    failHistory = true;
    const cache = createWarmCache<any>('topic');
    await new Promise((res) => cache.onSynced(res));
    expect(cache.getById('1')).toBeUndefined();
    liveHandler &&
      liveHandler({ id: '1', rev: 5, op: 'set', value: { name: 'new' } });
    expect(cache.getById('1')).toEqual({ name: 'new' });
  });

  it('processes canary reconcilers only for allowed admins', async () => {
    const flags = require('@/config/featureFlags');
    flags.default.canaryAdmins = ['0xabc'];
    const cache = createWarmCache<any>('topic');
    await new Promise((res) => cache.onSynced(res));
    const hitsA: any[] = [];
    const hitsB: any[] = [];
    cache.registerReconciler('0xAbC', (id, value) => hitsA.push({ id, value }));
    cache.registerReconciler('0xdef', (id, value) => hitsB.push({ id, value }));
    liveHandler &&
      liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'a2' } });
    expect(hitsA).toEqual([{ id: '1', value: { name: 'a2' } }]);
    expect(hitsB).toEqual([]);
  });

  it('tracks hit ratio', async () => {
    const cache = createWarmCache<any>('topic');
    await new Promise((res) => cache.onSynced(res));
    cache.getById('1');
    cache.getById('missing');
    expect(getCacheHitRatio('topic')).toBeCloseTo(0.5);
  });
});
