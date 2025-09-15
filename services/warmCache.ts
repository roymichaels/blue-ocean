import { EventEmitter } from 'events';
import {
  cacheHitRatioGauge,
  cacheHydrationHistogram,
} from '@/services/monitoring';
import { fetchHistory, subscribeWithAck } from '@/services/waku';
import { isWarmCacheEnabled } from '@/config/featureFlags';
import { E_STALE_DATA } from '@/services/cache';

export interface DiffMessage<T> {
  id: string;
  rev: number;
  op: 'set' | 'delete';
  value?: T;
}

export interface WarmCache<T> {
  getById(id: string): T | undefined;
  values(): T[];
  subscribe(
    filter: (id: string, value: T | undefined) => boolean,
    cb: (id: string, value: T | undefined) => void,
  ): () => void;
  onSynced(cb: () => void): () => void;
  registerReconciler(
    address: string,
    fn: (id: string, value: T | undefined) => void,
  ): () => void;
}

export function createWarmCache<T>(topic: string): WarmCache<T> {
  const store = new Map<string, { value: T; rev: number }>();
  const revisions = new Map<string, number>();
  const emitter = new EventEmitter();
  let synced = false;
  let stale = false;
  const buffer: DiffMessage<T>[] = [];
  const reconcilers = new Map<string, (id: string, value: T | undefined) => void>();
  const stats = { hits: 0, total: 0 };
  hitStats.set(topic, stats);
  const endHydration = cacheHydrationHistogram.startTimer({ cache: topic });

  function apply(msg: DiffMessage<T>): void {
    const currentRev = revisions.get(msg.id) ?? 0;
    const expected = currentRev === 0 ? msg.rev : currentRev + 1;
    if (currentRev !== 0 && msg.rev !== expected) {
      stale = true;
      emitter.emit('error', {
        code: E_STALE_DATA,
        id: msg.id,
        expected,
        actual: msg.rev,
      });
      return;
    }
    revisions.set(msg.id, msg.rev);
    if (msg.op === 'delete') {
      store.delete(msg.id);
    } else if (msg.value !== undefined) {
      store.set(msg.id, { value: msg.value, rev: msg.rev });
    }
    const value = store.get(msg.id)?.value;
    emitter.emit('update', msg.id, value);
    reconcilers.forEach((fn, addr) => {
      if (isWarmCacheEnabled(addr)) fn(msg.id, value);
    });
  }

  (async () => {
    let unsub: (() => void) | null = null;
    try {
      unsub = await subscribeWithAck(topic, (msg: DiffMessage<T>) => {
        if (!synced) buffer.push(msg);
        else apply(msg);
      });
      try {
        await fetchHistory(topic, apply);
      } catch (err) {
        console.warn(`History unavailable for ${topic}`, err);
      }
      buffer.forEach(apply);
      buffer.length = 0;
      synced = true;
      endHydration();
      emitter.emit('cache.synced');
      if (unsub) (emitter as any).unsub = unsub;
    } catch (err) {
      stale = true;
      endHydration();
      emitter.emit('error', { code: E_STALE_DATA, err });
      unsub?.();
    }
  })();

  return {
    getById(id: string) {
      if (stale || !isWarmCacheEnabled()) throw { code: E_STALE_DATA };
      const value = store.get(id)?.value;
      stats.total++;
      if (value !== undefined) stats.hits++;
      cacheHitRatioGauge.set({ cache: topic }, stats.total ? stats.hits / stats.total : 0);
      return value;
    },
    values() {
      if (stale || !isWarmCacheEnabled()) throw { code: E_STALE_DATA };
      return Array.from(store.values())
        .map((v) => v.value)
        .filter((value): value is T => value !== undefined);
    },
    subscribe(filter, cb) {
      const handler = (id: string, value: T | undefined) => {
        if (filter(id, value)) cb(id, value);
      };
      emitter.on('update', handler);
      return () => emitter.off('update', handler);
    },
    onSynced(cb: () => void) {
      if (synced) cb();
      emitter.on('cache.synced', cb);
      return () => emitter.off('cache.synced', cb);
    },
    registerReconciler(address, fn) {
      const key = address.toLowerCase();
      reconcilers.set(key, fn);
      return () => reconcilers.delete(key);
    },
  };
}

const hitStats = new Map<string, { hits: number; total: number }>();

export function getCacheHitRatio(topic: string): number {
  const s = hitStats.get(topic);
  if (!s || s.total === 0) return 0;
  return s.hits / s.total;
}

export default { createWarmCache, E_STALE_DATA, getCacheHitRatio };
