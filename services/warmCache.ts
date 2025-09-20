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

export type DiffOp = 'set' | 'delete' | 'merge';

export interface DiffMessage<T> {
  id: string;
  rev: number;
  op: DiffOp;
  value?: T | Partial<T>;
  ts?: number;
}

export interface CacheMutation<T> {
  id: string;
  rev?: number;
  op?: DiffOp;
  value?: T | Partial<T>;
  ts?: number;
}

export interface WarmCache<T> {
  getById(id: string): T | undefined;
  list(filter?: (id: string, value: T) => boolean): T[];
  values(): T[];
  subscribe(
    filter: (id: string, value: T | undefined) => boolean,
    cb: (id: string, value: T | undefined) => void,
  ): () => void;
  onSynced(cb: (event?: { cache: string }) => void): () => void;
  mutate(cmd: CacheMutation<T>): DiffMessage<T> | null;
  registerReconciler(
    address: string,
    fn: (id: string, value: T | undefined) => void,
  ): () => void;
}

export interface WarmCacheOptions<T> {
  hydrateLake?: () => Promise<Array<DiffMessage<T>>>;
  lagThresholdMs?: number;
}

type MessageSource = 'lake' | 'history' | 'live' | 'local';

const DEFAULT_LAG_THRESHOLD = 3000;
const CLOCK_SKEW_GUARD_MS = 60_000;

function normalizeMessage<T>(msg: DiffMessage<T>, source: MessageSource): DiffMessage<T> {
  const now = Date.now();
  let ts = typeof msg.ts === 'number' ? msg.ts : now;
  if ((source === 'live' || source === 'local') && ts > now + CLOCK_SKEW_GUARD_MS) {
    ts = now;
  }
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
  getHitStats().set(topic, stats);
  const endHydration = cacheHydrationHistogram.startTimer({ cache: topic });
  const lagThreshold = options.lagThresholdMs ?? DEFAULT_LAG_THRESHOLD;
  const metricLabels = { cache: topic } as const;
  cacheLagGauge.set(metricLabels, 0);

  function isValidDiff(msg: Partial<DiffMessage<T>>): msg is DiffMessage<T> {
    if (!msg || typeof msg !== 'object') return false;
    if (typeof msg.id !== 'string' || msg.id.length === 0) return false;
    if (typeof msg.rev !== 'number' || !Number.isFinite(msg.rev)) return false;
    if (msg.op !== 'set' && msg.op !== 'delete' && msg.op !== 'merge') return false;
    return true;
  }

  function apply(raw: DiffMessage<T>, source: MessageSource): DiffMessage<T> | null {
    if (!isValidDiff(raw)) return null;
    const msg = normalizeMessage(raw, source);
    if (!isValidDiff(msg)) return null;
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
        return null;
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
        return null;
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
      return null;
    }
    revisions.set(msg.id, msg.rev);
    let appliedValue: T | undefined;
    if (msg.op === 'delete') {
      store.delete(msg.id);
    } else if (msg.op === 'merge') {
      const base = store.get(msg.id)?.value;
      const patch =
        msg.value && typeof msg.value === 'object'
          ? (msg.value as Partial<T>)
          : ({} as Partial<T>);
      const merged = {
        ...(typeof base === 'object' && base !== null ? (base as Record<string, unknown>) : {}),
        ...(patch as Record<string, unknown>),
      } as T;
      store.set(msg.id, { value: merged, rev: msg.rev });
      appliedValue = merged;
    } else if (msg.value !== undefined) {
      store.set(msg.id, { value: msg.value as T, rev: msg.rev });
      appliedValue = msg.value as T;
    }
    if (msg.op !== 'delete' && appliedValue === undefined) {
      // Nothing to merge or set; do not emit updates but keep revision for idempotency
      return msg;
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
    return msg;
  }

  (async () => {
    let unsub: (() => void) | null = null;
    try {
      unsub = await subscribeWithAck(topic, (msg: DiffMessage<T>) => {
        if (!isValidDiff(msg)) return;
        const normalized = normalizeMessage(msg, 'live');
        if (!isValidDiff(normalized)) return;
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
      emitter.emit('cache.synced', { cache: topic });
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
    list(filter) {
      if (stale || !isWarmCacheEnabled()) throw { code: E_STALE_DATA };
      if (lagging) throw { code: E_SYNC_LAG, lagMs: lastLagMs };
      const res: T[] = [];
      store.forEach(({ value }, id) => {
        if (value === undefined) return;
        if (!filter || filter(id, value)) res.push(value);
      });
      return res;
    },
    values() {
      return this.list();
    },
    subscribe(filter, cb) {
      const handler = (id: string, value: T | undefined) => {
        if (filter(id, value)) cb(id, value);
      };
      emitter.on('update', handler);
      return () => emitter.off('update', handler);
    },
    onSynced(cb: (event?: { cache: string }) => void) {
      if (synced) cb({ cache: topic });
      const handler = (evt: { cache: string }) => cb(evt);
      emitter.on('cache.synced', handler);
      return () => emitter.off('cache.synced', handler);
    },
    mutate(cmd: CacheMutation<T>) {
      if (stale || !isWarmCacheEnabled()) throw { code: E_STALE_DATA };
      const currentRev = revisions.get(cmd.id) ?? 0;
      const rev = cmd.rev ?? currentRev + 1;
      const op: DiffOp = cmd.op ?? (cmd.value === undefined ? 'delete' : 'set');
      return apply({
        id: cmd.id,
        rev,
        op,
        value: cmd.value,
        ts: cmd.ts,
      }, 'local');
    },
    registerReconciler(address, fn) {
      const key = address.toLowerCase();
      reconcilers.set(key, fn);
      return () => reconcilers.delete(key);
    },
  };
}

let _hitStats: Map<string, { hits: number; total: number }> = new Map();

function getHitStats(): Map<string, { hits: number; total: number }> {
  return _hitStats;
}

export function getCacheHitRatio(topic: string): number {
  const s = getHitStats().get(topic);
  if (!s || s.total === 0) return 0;
  return s.hits / s.total;
}

export { E_STALE_DATA, E_SYNC_LAG };

export default { createWarmCache, E_STALE_DATA, E_SYNC_LAG, getCacheHitRatio };
