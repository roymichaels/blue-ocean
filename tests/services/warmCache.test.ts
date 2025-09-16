import type { DiffMessage } from '@/services/warmCache';

let createWarmCache: any;
let E_STALE_DATA: string;
let E_SYNC_LAG: string;
let getCacheHitRatio: (topic: string) => number;

let history: DiffMessage<any>[] = [];
let lake: DiffMessage<any>[] = [];
let hydrateLake: jest.Mock<Promise<DiffMessage<any>[]>, []>;
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
  ({ createWarmCache, E_STALE_DATA, E_SYNC_LAG, getCacheHitRatio } = require('@/services/warmCache'));
  lake = [
    { id: '1', rev: 1, op: 'set', value: { name: 'a' } },
    { id: '2', rev: 1, op: 'set', value: { name: 'b' } },
  ];
  history = [];
  hydrateLake = jest.fn(async () => lake);
  liveHandler = null;
  failHistory = false;
});

describe('warmCache', () => {
  it('warm boot matches cold boot results', async () => {
    const warm = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => warm.onSynced(res));
    // apply live diff
    liveHandler &&
      liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'a2' } });
    expect(warm.getById('1')).toEqual({ name: 'a2' });

    // cold boot from combined history
    history = [
      { id: '1', rev: 1, op: 'set', value: { name: 'a' } },
      { id: '1', rev: 2, op: 'set', value: { name: 'a2' } },
      { id: '2', rev: 1, op: 'set', value: { name: 'b' } },
    ];
    const cold = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => cold.onSynced(res));
    expect(cold.getById('1')).toEqual({ name: 'a2' });
    expect(cold.getById('2')).toEqual({ name: 'b' });
  });

  it('detects conflicting diffs', async () => {
    const cache = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => cache.onSynced(res));
    liveHandler &&
      liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'a2' } });
    expect(cache.getById('1')).toEqual({ name: 'a2' });
    // duplicate revision triggers stale state
    liveHandler &&
      liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'bad' } });
    // @ts-expect-error - matcher provided by jest-extended typings
    expect(() => cache.getById('1')).toThrowErrorMatchingObject({
      code: E_STALE_DATA,
    });
  });

  it('throws on out-of-order diff', async () => {
    const cache = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => cache.onSynced(res));
    liveHandler &&
      liveHandler({ id: '1', rev: 4, op: 'set', value: { name: 'bad' } });
    // @ts-expect-error - matcher provided by jest-extended typings
    expect(() => cache.getById('1')).toThrowErrorMatchingObject({
      code: E_STALE_DATA,
    });
  });

  it('tracks revision numbers after deletes to catch stale updates', async () => {
    const cache = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => cache.onSynced(res));
    liveHandler && liveHandler({ id: '1', rev: 2, op: 'delete' });
    expect(cache.getById('1')).toBeUndefined();
    liveHandler &&
      liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'bad' } });
    // @ts-expect-error - matcher provided by jest-extended typings
    expect(() => cache.getById('1')).toThrowErrorMatchingObject({
      code: E_STALE_DATA,
    });
  });

  it('falls back when history fails', async () => {
    failHistory = true;
    const cache = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => cache.onSynced(res));
    expect(cache.getById('1')).toEqual({ name: 'a' });
    liveHandler &&
      liveHandler({ id: '1', rev: 5, op: 'set', value: { name: 'new' } });
    expect(cache.getById('1')).toEqual({ name: 'new' });
  });

  it('processes canary reconcilers only for allowed admins', async () => {
    const flags = require('@/config/featureFlags');
    flags.default.canaryAdmins = ['0xabc'];
    const cache = createWarmCache('topic', { hydrateLake });
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
    const cache = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => cache.onSynced(res));
    cache.getById('1');
    cache.getById('missing');
    expect(getCacheHitRatio('topic')).toBeCloseTo(0.5);
  });

  it('throws sync lag error when updates fall behind', async () => {
    jest.useFakeTimers();
    try {
      const cache = createWarmCache('topic', { hydrateLake, lagThresholdMs: 1000 });
      await new Promise((res) => cache.onSynced(res));
      jest.setSystemTime(0);
      liveHandler &&
        liveHandler({ id: '1', rev: 2, op: 'set', value: { name: 'late' }, ts: 0 });
      jest.setSystemTime(2005);
      // @ts-expect-error - matcher provided by jest-extended typings
      expect(() => cache.getById('1')).toThrowErrorMatchingObject({ code: E_SYNC_LAG });
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses a 3s default lag threshold before raising sync alerts', async () => {
    jest.useFakeTimers();
    try {
      const cache = createWarmCache('topic', { hydrateLake });
      await new Promise((res) => cache.onSynced(res));
      jest.setSystemTime(0);
      liveHandler &&
        liveHandler({ id: '2', rev: 2, op: 'set', value: { name: 'slow' }, ts: 0 });
      jest.setSystemTime(2800);
      expect(cache.getById('2')).toEqual({ name: 'slow' });
      jest.setSystemTime(3300);
      // @ts-expect-error - matcher provided by jest-extended typings
      expect(() => cache.getById('2')).toThrowErrorMatchingObject({ code: E_SYNC_LAG });
    } finally {
      jest.useRealTimers();
    }
  });

  it('lists cached entries with optional filtering', async () => {
    const cache = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => cache.onSynced(res));
    expect(cache.list()).toHaveLength(2);
    const filtered = cache.list((id) => id === '1');
    expect(filtered).toEqual([{ name: 'a' }]);
  });

  it('mutates entries with merge semantics and idempotent revs', async () => {
    const cache = createWarmCache('topic', { hydrateLake });
    await new Promise((res) => cache.onSynced(res));
    const created = cache.mutate({ id: '3', rev: 1, op: 'set', value: { name: 'c', stock: 1 } });
    expect(created).toMatchObject({ id: '3', rev: 1, op: 'set' });
    expect(cache.getById('3')).toEqual({ name: 'c', stock: 1 });
    const merged = cache.mutate({ id: '3', rev: 2, op: 'merge', value: { stock: 5 } });
    expect(merged).toMatchObject({ id: '3', rev: 2, op: 'merge' });
    expect(cache.getById('3')).toEqual({ name: 'c', stock: 5 });
    const duplicate = cache.mutate({ id: '3', rev: 2, op: 'merge', value: { stock: 5 } });
    expect(duplicate).toBeNull();
  });

  it('clamps future timestamps when mutating locally', async () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(1_000);
      const cache = createWarmCache('topic', { hydrateLake });
      await new Promise((res) => cache.onSynced(res));
      const diff = cache.mutate({
        id: '4',
        rev: 1,
        op: 'set',
        value: { name: 'future' },
        ts: 1_000 + 10 * 60_000,
      });
      expect(diff?.ts).toBe(1_000);
    } finally {
      jest.useRealTimers();
    }
  });
});
