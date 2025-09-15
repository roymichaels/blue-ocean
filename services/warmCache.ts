import { EventEmitter } from 'events';
import {
  cacheHitRatioGauge,
  cacheHydrationHistogram,
  cacheLagGauge,
  cacheLagAlertCounter,
} from '@/services/monitoring';
import { fetchHistory, subscribeWithAck } from '@/services/waku';
import { isWarmCacheEnabled } from '@/config/featureFlags';
import { E_STALE_DATA, E_SYNC_LAG } from '@/services/cache';

export interface DiffMessage<T> {
  id: string;
  rev: number;
  op: 'set' | 'delete';
  value?: T;
  ts?: number;
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

export interface WarmCacheOptions<T> {
  hydrateLake?: () => Promise<Array<DiffMessage<T>>>;
  lagThresholdMs?: number;
}

type MessageSource = 'lake' | 'history' | 'live';

const DEFAULT_LAG_THRESHOLD = 3000;

function normalizeMessage<T>(msg: DiffMessage<T>): DiffMessage<T> {
  const ts = typeof msg.ts === 'number' ? msg.ts : Date.now();
  return { ...msg, ts };
}

export function createWarmCache<T>(
  topic: string,
  options: WarmCacheOptions<T> = {},
): WarmCache<T> {
  const store = new Map<string, { value: T; rev: number }>();
  const revisions = new Map<string, number>();
  const emitter = new EventEmitter();
  let synced = false;
  let stale = false;
  let lagging = false;
  let lastLagMs = 0;
  const buffer: { msg: DiffMessage<T>; source: MessageSource }[] = [];
  const reconcilers = new Map<string, (id: string, value: T | undefined) => void>();
  const stats = { hits: 0, total: 0 };
  hitStats.set(topic, stats);
  const endHydration = cacheHydrationHistogram.startTimer({ cache: topic });
  const lagThreshold = options.lagThresholdMs ?? DEFAULT_LAG_THRESHOLD;
  const metricLabels = { cache: topic } as const;
  cacheLagGauge.set(metricLabels, 0);

  function apply(raw: DiffMessage<T>, source: MessageSource): void {
    const msg = normalizeMessage(raw);
    const currentRev = revisions.get(msg.id) ?? 0;
    const expected = currentRev === 0 ? msg.rev : currentRev + 1;
    if (currentRev !== 0) {
      if (msg.rev === currentRev) {
        if (source === 'live') {
          stale = true;
          emitter.emit('error', {
            code: E_STALE_DATA,
            id: msg.id,
            expected: currentRev + 1,
            actual: msg.rev,
          });
        }
        return;
      }
      if (msg.rev < currentRev) {
        if (source === 'live') {
          stale = true;
          emitter.emit('error', {
            code: E_STALE_DATA,
            id: msg.id,
            expected: currentRev + 1,
            actual: msg.rev,
          });
        }
        return;
      }
    }
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
    if (synced && source === 'live') {
      const now = Date.now();
      const lagMs = Math.max(0, now - (msg.ts ?? now));
      cacheLagGauge.set(metricLabels, lagMs);
      if (lagMs > lagThreshold) {
        if (!lagging || lagMs > lastLagMs) {
          cacheLagAlertCounter.inc(metricLabels);
        }
        lagging = true;
        lastLagMs = lagMs;
        emitter.emit('error', { code: E_SYNC_LAG, id: msg.id, lagMs });
      } else if (lagging) {
        lagging = false;
        lastLagMs = 0;
      }
    } else if (!synced && source !== 'live') {
      cacheLagGauge.set(metricLabels, 0);
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
        const normalized = normalizeMessage(msg);
        if (!synced) buffer.push({ msg: normalized, source: 'live' });
        else apply(normalized, 'live');
      });
      if (options.hydrateLake) {
        try {
          const lakeEntries = await options.hydrateLake();
          for (const entry of lakeEntries) {
            apply({ ...entry, op: entry.op ?? 'set' }, 'lake');
          }
        } catch (err) {
          console.warn(`Lake hydration unavailable for ${topic}`, err);
        }
      }
      try {
        await fetchHistory(topic, (historyMsg: DiffMessage<T>) => {
          apply(historyMsg, 'history');
        });
      } catch (err) {
        console.warn(`History unavailable for ${topic}`, err);
      }
      buffer.forEach(({ msg, source }) => apply(msg, source));
      buffer.length = 0;
      synced = true;
      endHydration();
      cacheLagGauge.set(metricLabels, 0);
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
      if (lagging) throw { code: E_SYNC_LAG, lagMs: lastLagMs };
      const value = store.get(id)?.value;
      stats.total++;
      if (value !== undefined) stats.hits++;
      cacheHitRatioGauge.set({ cache: topic }, stats.total ? stats.hits / stats.total : 0);
      return value;
    },
    values() {
      if (stale || !isWarmCacheEnabled()) throw { code: E_STALE_DATA };
      if (lagging) throw { code: E_SYNC_LAG, lagMs: lastLagMs };
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

export { E_STALE_DATA, E_SYNC_LAG };

export default { createWarmCache, E_STALE_DATA, E_SYNC_LAG, getCacheHitRatio };
