import { EventEmitter } from 'events';
import { fetchHistory } from '@/services/waku';
import { listValues } from '@/services/nearKvStore';

type Source = 'snapshot' | 'history' | 'live';

export interface SnapshotEntry {
  key: string;
  value: string;
}

export interface DecodedEntry<T> {
  id: string;
  value: T | null;
  rev?: number;
  ts?: number;
  source?: Source;
}

export interface TopicConfig<T> {
  topic: string;
  address?: string;
  decodeMessage: (message: unknown) => DecodedEntry<T> | null;
  decodeSnapshot?: (entry: SnapshotEntry) => DecodedEntry<T> | null;
  merge?: (existing: T, incoming: T) => T;
}

interface StoredRecord<T> {
  value: T;
  rev: number;
  ts: number;
  source: Source;
}

interface TopicState<T> {
  config: TopicConfig<T>;
  data: Map<string, StoredRecord<T>>;
  buffer: unknown[];
  ready: boolean;
  emitter: EventEmitter;
}

type FetchHistory = typeof fetchHistory;
type ListValues = typeof listValues;

interface EventStoreDeps {
  fetchHistory?: FetchHistory;
  listValues?: ListValues;
}

export interface TopicUpdateEvent<T> {
  topic: string;
  id: string;
  value: T | undefined;
  source: Source;
}

export interface TopicErrorEvent {
  topic: string;
  error: unknown;
}

function applyMerge<T>(
  current: StoredRecord<T> | undefined,
  incoming: T,
  merge?: (existing: T, next: T) => T,
): T {
  if (!current) return incoming;
  if (!merge) return incoming;
  try {
    return merge(current.value, incoming);
  } catch {
    return incoming;
  }
}

export class EventStore {
  private readonly fetchHistory: FetchHistory;
  private readonly listValues: ListValues;
  private readonly topics = new Map<string, TopicState<any>>();
  private hydrating: Promise<void> | null = null;
  private hydrated = false;

  constructor(deps: EventStoreDeps = {}) {
    this.fetchHistory = deps.fetchHistory ?? fetchHistory;
    this.listValues = deps.listValues ?? listValues;
  }

  registerTopic<T>(config: TopicConfig<T>): void {
    if (this.topics.has(config.topic)) {
      throw new Error(`Topic ${config.topic} already registered`);
    }
    const state: TopicState<T> = {
      config,
      data: new Map<string, StoredRecord<T>>(),
      buffer: [],
      ready: false,
      emitter: new EventEmitter(),
    };
    this.topics.set(config.topic, state);
  }

  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    if (this.hydrating) return this.hydrating;

    this.hydrating = (async () => {
      for (const state of this.topics.values()) {
        await this.hydrateTopic(state);
      }
      this.hydrated = true;
    })();

    try {
      await this.hydrating;
    } finally {
      this.hydrating = null;
    }
  }

  ingest<T>(topic: string, message: T, source: Source = 'live'): void {
    const state = this.topics.get(topic);
    if (!state) return;
    if (!state.ready) {
      state.buffer.push({ message, source });
      return;
    }
    this.applyMessage(state as TopicState<any>, message, source);
  }

  get<T>(topic: string, id: string): T | undefined {
    const state = this.topics.get(topic);
    if (!state) return undefined;
    return state.data.get(id)?.value as T | undefined;
  }

  values<T>(topic: string): T[] {
    const state = this.topics.get(topic);
    if (!state) return [];
    return Array.from(state.data.values()).map((r) => r.value as T);
  }

  isHydrated(topic?: string): boolean {
    if (!topic) return this.hydrated;
    const state = this.topics.get(topic);
    return state ? state.ready : false;
  }

  onUpdate<T>(topic: string, listener: (event: TopicUpdateEvent<T>) => void): () => void {
    const state = this.topics.get(topic);
    if (!state) throw new Error(`Topic ${topic} is not registered`);
    const handler = (event: TopicUpdateEvent<T>) => listener(event);
    state.emitter.on('update', handler);
    return () => {
      state.emitter.off('update', handler);
    };
  }

  onSynced(topic: string, listener: (topic: string) => void): () => void {
    const state = this.topics.get(topic);
    if (!state) throw new Error(`Topic ${topic} is not registered`);
    state.emitter.on('synced', listener);
    return () => {
      state.emitter.off('synced', listener);
    };
  }

  onError(topic: string, listener: (event: TopicErrorEvent) => void): () => void {
    const state = this.topics.get(topic);
    if (!state) throw new Error(`Topic ${topic} is not registered`);
    state.emitter.on('error', listener);
    return () => {
      state.emitter.off('error', listener);
    };
  }

  private async hydrateTopic<T>(state: TopicState<T>): Promise<void> {
    if (state.ready) return;
    try {
      if (state.config.address && state.config.decodeSnapshot) {
        await this.loadSnapshots(state);
      }
      await this.fetchHistory(state.config.topic, (msg: unknown) => {
        this.applyDecoded(state, state.config.decodeMessage(msg), 'history');
      });
      this.flushBuffer(state);
      state.ready = true;
      state.emitter.emit('synced', state.config.topic);
    } catch (err) {
      state.emitter.emit('error', { topic: state.config.topic, error: err });
      throw err;
    }
  }

  private async loadSnapshots<T>(state: TopicState<T>): Promise<void> {
    const { config } = state;
    if (!config.address || !config.decodeSnapshot) return;
    const entries = await this.listValues(config.address);
    for (const entry of entries) {
      this.applyDecoded(state, config.decodeSnapshot(entry), 'snapshot');
    }
  }

  private applyMessage<T>(state: TopicState<T>, message: unknown, source: Source): void {
    this.applyDecoded(state, state.config.decodeMessage(message), source);
  }

  private flushBuffer<T>(state: TopicState<T>): void {
    if (state.buffer.length === 0) return;
    for (const item of state.buffer) {
      const payload = item as { message: unknown; source: Source };
      this.applyMessage(state, payload.message, payload.source ?? 'live');
    }
    state.buffer.length = 0;
  }

  private applyDecoded<T>(
    state: TopicState<T>,
    decoded: DecodedEntry<T> | null,
    defaultSource: Source,
  ): void {
    if (!decoded || !decoded.id) return;
    const source = decoded.source ?? defaultSource;
    const existing = state.data.get(decoded.id);
    const existingRev = existing?.rev ?? Number.NEGATIVE_INFINITY;
    const incomingRev = decoded.rev ?? (existing ? existing.rev + 1 : 0);

    if (existing && incomingRev <= existingRev) {
      return;
    }

    if (decoded.value === null) {
      if (existing) {
        state.data.delete(decoded.id);
        state.emitter.emit('update', {
          topic: state.config.topic,
          id: decoded.id,
          value: undefined,
          source,
        } as TopicUpdateEvent<T>);
      }
      return;
    }

    const value = applyMerge(existing, decoded.value, state.config.merge);
    const record: StoredRecord<T> = {
      value,
      rev: incomingRev,
      ts: decoded.ts ?? Date.now(),
      source,
    };
    state.data.set(decoded.id, record);
    state.emitter.emit('update', {
      topic: state.config.topic,
      id: decoded.id,
      value: record.value,
      source: record.source,
    } as TopicUpdateEvent<T>);
  }
}

const eventStore = new EventStore();

export default eventStore;
