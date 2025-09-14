import { EventEmitter } from 'events';
import { fetchHistory, subscribeWithAck } from '@/services/waku';
import { isWarmCacheEnabled } from '@/config/featureFlags';

export const E_STALE_DATA = 'E_STALE_DATA';

export interface DiffMessage<T> {
  id: string;
  rev: number;
  op: 'set' | 'delete';
  value?: T;
}

export interface WarmCache<T> {
  getById(id: string): T | undefined;
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
  const emitter = new EventEmitter();
  let synced = false;
  let stale = false;
  const buffer: DiffMessage<T>[] = [];
  const reconcilers = new Map<string, (id: string, value: T | undefined) => void>();

  function apply(msg: DiffMessage<T>): void {
    const current = store.get(msg.id);
    if (current && msg.rev !== current.rev + 1) {
      stale = true;
      emitter.emit('error', { code: E_STALE_DATA, id: msg.id });
      return;
    }
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
    try {
      const unsub = await subscribeWithAck(topic, (msg: DiffMessage<T>) => {
        if (!synced) buffer.push(msg);
        else apply(msg);
      });
      await fetchHistory(topic, apply);
      buffer.forEach(apply);
      buffer.length = 0;
      synced = true;
      emitter.emit('cache.synced');
      // expose unsubscribe on emitter
      (emitter as any).unsub = unsub;
    } catch (err) {
      stale = true;
      emitter.emit('error', { code: E_STALE_DATA, err });
    }
  })();

  return {
    getById(id: string) {
      if (stale || !isWarmCacheEnabled()) throw { code: E_STALE_DATA };
      return store.get(id)?.value;
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

export default { createWarmCache, E_STALE_DATA };
