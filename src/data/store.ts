import { EventEmitter } from 'events';
import {
  listValues,
  setValue,
  getValue,
  removeValue,
} from '@/services/nearKvStore';

type Source = 'snapshot' | 'history' | 'live' | 'storage';

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

interface BufferedMessage {
  message: unknown;
  source: Source;
}

type FetchHistory = (topic: string, cb: (msg: unknown) => void) => Promise<void>;
type ListValues = typeof listValues;
type SubscribeWithAck = (
  topic: string,
  cb: (msg: unknown) => void,
) => Promise<() => void>;

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type SecureStoreLike = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
};

type NearKvLike = {
  getValue(address: string, key: string): Promise<string | null>;
  setValue(address: string, key: string, value: string): Promise<void>;
  removeValue(address: string, key: string): Promise<void>;
};

interface KeyValueStore {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

interface SecretStorage {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
}

interface TopicState<T> {
  config: TopicConfig<T>;
  data: Map<string, StoredRecord<T>>;
  buffer: BufferedMessage[];
  ready: boolean;
  emitter: EventEmitter;
  storageKey: string;
  persistPromise: Promise<void> | null;
  pendingPersist: boolean;
  subscribed: boolean;
  unsubscribe?: () => void;
}

interface PersistedRecord<T> {
  id: string;
  value: T;
  rev: number;
  ts: number;
}

interface PersistedTopicPayload<T> {
  records: PersistedRecord<T>[];
}

interface EventStoreDeps {
  fetchHistory?: FetchHistory;
  listValues?: ListValues;
  subscribeWithAck?: SubscribeWithAck;
  storage?: KeyValueStore;
  secretStorage?: SecretStorage;
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

const STORAGE_NAMESPACE = 'event-store/v1';
const SECRET_STORAGE_KEY = 'secret';
const EVENT_STORE_ADDRESS = 'event-store-cache';

function safeKey(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    out += input.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return out;
}

class AsyncStorageAdapter implements KeyValueStore {
  constructor(private readonly storage: AsyncStorageLike) {}

  private key(key: string): string {
    return `${STORAGE_NAMESPACE}:${key}`;
  }

  async read(key: string): Promise<string | null> {
    return this.storage.getItem(this.key(key));
  }

  async write(key: string, value: string): Promise<void> {
    await this.storage.setItem(this.key(key), value);
  }

  async remove(key: string): Promise<void> {
    await this.storage.removeItem(this.key(key));
  }
}

class KeyValueSecretStorage implements SecretStorage {
  constructor(private readonly store: KeyValueStore) {}

  async read(key: string): Promise<string | null> {
    return this.store.read(key);
  }

  async write(key: string, value: string): Promise<void> {
    await this.store.write(key, value);
  }
}

class SecureStoreSecretStorage implements SecretStorage {
  constructor(private readonly secure: SecureStoreLike) {}

  private key(key: string): string {
    return `${STORAGE_NAMESPACE}:${key}`;
  }

  async read(key: string): Promise<string | null> {
    return this.secure.getItemAsync(this.key(key));
  }

  async write(key: string, value: string): Promise<void> {
    await this.secure.setItemAsync(this.key(key), value);
  }
}

class NearKvAdapter implements KeyValueStore {
  constructor(private readonly kv: NearKvLike, private readonly address: string) {}

  async read(key: string): Promise<string | null> {
    return this.kv.getValue(this.address, key);
  }

  async write(key: string, value: string): Promise<void> {
    await this.kv.setValue(this.address, key, value);
  }

  async remove(key: string): Promise<void> {
    await this.kv.removeValue(this.address, key);
  }
}

function tryRequire<T = unknown>(id: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require(id) as T;
  } catch {
    return null;
  }
}

function getCryptoImpl(): Crypto | null {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const nodeCrypto = require('crypto');
    if (nodeCrypto?.webcrypto?.subtle) {
      return nodeCrypto.webcrypto as Crypto;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  return binary;
}

function fromBase64(payload: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(payload, 'base64'));
  }
  if (typeof atob !== 'undefined') {
    const binary = atob(payload);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  const out = new Uint8Array(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    out[i] = payload.charCodeAt(i);
  }
  return out;
}

function createDefaultStorage(): {
  store: KeyValueStore | null;
  secrets: SecretStorage | null;
} {
  const asyncModule = tryRequire<any>('@react-native-async-storage/async-storage');
  const asyncStorage: AsyncStorageLike | null = asyncModule
    ? asyncModule.default ?? asyncModule
    : null;
  if (asyncStorage) {
    const store = new AsyncStorageAdapter(asyncStorage);
    const secureModule = tryRequire<any>('expo-secure-store');
    const secureStore: SecureStoreLike | null = secureModule
      ? secureModule.default ?? secureModule
      : null;
    const secrets = secureStore
      ? new SecureStoreSecretStorage(secureStore)
      : new KeyValueSecretStorage(store);
    return { store, secrets };
  }

  const kvModule: NearKvLike = {
    getValue,
    setValue,
    removeValue,
  };
  const store = new NearKvAdapter(kvModule, EVENT_STORE_ADDRESS);
  const secrets = new KeyValueSecretStorage(store);
  return { store, secrets };
}

function loadWaku(): { fetchHistory: FetchHistory; subscribeWithAck: SubscribeWithAck } {
  const mod = tryRequire<any>('@/services/waku');
  if (mod && typeof mod.fetchHistory === 'function' && typeof mod.subscribeWithAck === 'function') {
    return {
      fetchHistory: mod.fetchHistory.bind(mod) as FetchHistory,
      subscribeWithAck: mod.subscribeWithAck.bind(mod) as SubscribeWithAck,
    };
  }
  return {
    fetchHistory: async () => {},
    subscribeWithAck: async () => () => {},
  };
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

  private readonly subscribeWithAck: SubscribeWithAck;

  private readonly storage: KeyValueStore | null;

  private readonly secretStorage: SecretStorage | null;

  private readonly topics = new Map<string, TopicState<any>>();

  private hydrating: Promise<void> | null = null;

  private hydrated = false;

  private keyPromise: Promise<CryptoKey | null> | null = null;

  constructor(deps: EventStoreDeps = {}) {
    const defaults = createDefaultStorage();
    const waku = loadWaku();
    this.fetchHistory = deps.fetchHistory ?? waku.fetchHistory;
    this.listValues = deps.listValues ?? listValues;
    this.subscribeWithAck = deps.subscribeWithAck ?? waku.subscribeWithAck;
    this.storage = deps.storage ?? defaults.store;
    if (deps.secretStorage) {
      this.secretStorage = deps.secretStorage;
    } else if (deps.storage) {
      this.secretStorage = new KeyValueSecretStorage(deps.storage);
    } else if (defaults.secrets) {
      this.secretStorage = defaults.secrets;
    } else if (this.storage) {
      this.secretStorage = new KeyValueSecretStorage(this.storage);
    } else {
      this.secretStorage = null;
    }
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
      storageKey: this.topicStorageKey(config.topic),
      persistPromise: null,
      pendingPersist: false,
      subscribed: false,
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
    if (state.ready) listener(topic);
    const handler = (t: string) => listener(t);
    state.emitter.on('cache.synced', handler);
    return () => {
      state.emitter.off('cache.synced', handler);
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

  private topicStorageKey(topic: string): string {
    return `topic-${safeKey(topic)}`;
  }

  private async hydrateTopic<T>(state: TopicState<T>): Promise<void> {
    if (state.ready) return;
    try {
      await this.loadPersisted(state);
      await this.ensureSubscription(state);
      if (state.config.address && state.config.decodeSnapshot) {
        await this.loadSnapshots(state);
      }
      await this.fetchHistory(state.config.topic, (msg: unknown) => {
        this.applyDecoded(state, state.config.decodeMessage(msg), 'history');
      });
      state.ready = true;
      this.flushBuffer(state);
      state.emitter.emit('cache.synced', state.config.topic);
      state.emitter.emit('synced', state.config.topic);
    } catch (err) {
      state.emitter.emit('error', { topic: state.config.topic, error: err });
      throw err;
    }
  }

  private async ensureSubscription<T>(state: TopicState<T>): Promise<void> {
    if (state.subscribed) return;
    try {
      const unsubscribe = await this.subscribeWithAck(state.config.topic, (msg: unknown) => {
        this.ingest(state.config.topic, msg, 'live');
      });
      state.unsubscribe = unsubscribe;
      state.subscribed = true;
    } catch (err) {
      state.subscribed = false;
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

  private async loadPersisted<T>(state: TopicState<T>): Promise<void> {
    if (!this.storage) return;
    try {
      const raw = await this.storage.read(state.storageKey);
      if (!raw) return;
      const json = await this.decrypt(raw);
      if (!json) return;
      const parsed = JSON.parse(json) as PersistedTopicPayload<T> | null;
      if (!parsed || !Array.isArray(parsed.records)) return;
      state.data.clear();
      for (const record of parsed.records) {
        this.applyDecoded(
          state,
          {
            id: record.id,
            value: record.value,
            rev: record.rev,
            ts: record.ts,
            source: 'storage',
          },
          'storage',
          false,
        );
      }
    } catch (err) {
      await this.storage.remove(state.storageKey).catch(() => {});
      state.emitter.emit('error', { topic: state.config.topic, error: err });
    }
  }

  private applyMessage<T>(state: TopicState<T>, message: unknown, source: Source): void {
    this.applyDecoded(state, state.config.decodeMessage(message), source);
  }

  private flushBuffer<T>(state: TopicState<T>): void {
    if (state.buffer.length === 0) return;
    for (const payload of state.buffer) {
      this.applyMessage(state, payload.message, payload.source ?? 'live');
    }
    state.buffer.length = 0;
  }

  private applyDecoded<T>(
    state: TopicState<T>,
    decoded: DecodedEntry<T> | null,
    defaultSource: Source,
    persist = true,
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
        if (persist) this.schedulePersist(state);
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
    if (persist) this.schedulePersist(state);
    state.emitter.emit('update', {
      topic: state.config.topic,
      id: decoded.id,
      value: record.value,
      source: record.source,
    } as TopicUpdateEvent<T>);
  }

  private schedulePersist<T>(state: TopicState<T>): void {
    if (!this.storage) return;
    if (state.persistPromise) {
      state.pendingPersist = true;
      return;
    }
    state.persistPromise = (async () => {
      try {
        await this.persistTopic(state);
      } finally {
        state.persistPromise = null;
        if (state.pendingPersist) {
          state.pendingPersist = false;
          this.schedulePersist(state);
        }
      }
    })();
  }

  private async persistTopic<T>(state: TopicState<T>): Promise<void> {
    if (!this.storage) return;
    if (state.data.size === 0) {
      await this.storage.remove(state.storageKey).catch(() => {});
      return;
    }
    const payload: PersistedTopicPayload<T> = {
      records: Array.from(state.data.entries()).map(([id, record]) => ({
        id,
        value: record.value,
        rev: record.rev,
        ts: record.ts,
      })),
    };
    const json = JSON.stringify(payload);
    const encrypted = await this.encrypt(json);
    if (!encrypted) return;
    await this.storage.write(state.storageKey, encrypted);
  }

  private async encrypt(value: string): Promise<string | null> {
    const cryptoImpl = getCryptoImpl();
    if (!cryptoImpl?.subtle) return null;
    const key = await this.getCryptoKey();
    if (!key) return null;
    const ivBytes = cryptoImpl.getRandomValues(new Uint8Array(12));
    const ivBuffer = Buffer.from(ivBytes);
    const enc = new TextEncoder().encode(value);
    const cipher = await cryptoImpl.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      enc,
    );
    const ivStr = toBase64(new Uint8Array(ivBuffer));
    const cipherStr = toBase64(new Uint8Array(cipher));
    return `${ivStr}:${cipherStr}`;
  }

  private async decrypt(payload: string): Promise<string | null> {
    const cryptoImpl = getCryptoImpl();
    if (!cryptoImpl?.subtle) return null;
    const key = await this.getCryptoKey();
    if (!key) return null;
    const [ivStr, dataStr] = payload.split(':');
    if (!ivStr || !dataStr) return null;
    const ivBytes = fromBase64(ivStr);
    const ivBuffer = Buffer.from(ivBytes);
    const data = fromBase64(dataStr);
    const dataBuffer = Buffer.from(data);
    const buf = await cryptoImpl.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      dataBuffer,
    );
    return new TextDecoder().decode(buf);
  }

  private async getCryptoKey(): Promise<CryptoKey | null> {
    if (!this.secretStorage) return null;
    if (this.keyPromise) {
      try {
        return await this.keyPromise;
      } catch {
        this.keyPromise = null;
      }
    }
    const cryptoImpl = getCryptoImpl();
    if (!cryptoImpl?.subtle) return null;
    this.keyPromise = (async () => {
      let secret = await this.secretStorage!.read(SECRET_STORAGE_KEY);
      if (!secret) {
        const bytes = cryptoImpl.getRandomValues(new Uint8Array(32));
        secret = toBase64(bytes);
        await this.secretStorage!.write(SECRET_STORAGE_KEY, secret);
      }
      const raw = fromBase64(secret);
      const keyBuffer = Buffer.from(raw);
      return cryptoImpl.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt'],
      );
    })();
    try {
      return await this.keyPromise;
    } catch {
      this.keyPromise = null;
      return null;
    }
  }
}

const eventStore = new EventStore();

export default eventStore;
