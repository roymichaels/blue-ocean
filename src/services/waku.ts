// TODO:CORE-020 buildTopic(domain,{tenantId,storeId}) everywhere
// TODO:CORE-023 derive shared keys per-tenant (replace per-process secret)

import type { LightNode } from '@waku/sdk';
import type { types } from 'near-lake-framework';
import { getClient } from '@/utils/transport';
import { errorLog } from '@/utils/logger';
import { gzipSize } from '@/utils/gzipSize';
import config from '@/config';
import { canonicalJson } from '@/utils/serialization';
import { retryWithBackoff } from '@/utils/retry';
import { enqueue, flush } from '@/utils/wakuStore';
import {
  encrypt,
  decrypt,
  getCurrentKeyEpoch,
  getSupportedKeyEpochs,
  WakuDecryptError,
} from '@/utils/wakuCrypto';
import { serviceLatency, serviceFailures } from '@/utils/observability';
import { wakuDecryptErrorCounter } from './monitoring';
import { initLake } from './nearLake';
import { topicFor } from '@blue-ocean/utils';
import { getNetworkId, getContractId } from '@/hooks/config';
import { randomBytes } from '@noble/hashes/utils';

import type { Store } from '@/types';

// TODO:TODO-103 Break the monolithic Waku service into focused modules so subscription, publishing, and sync concerns stay isolated.
// TODO:REC-203 Investigate streaming compression primitives to mitigate zlib blocking when handling large relay payloads.

const fallbackLogger = {
  info: (...args: unknown[]) => errorLog(...args),
  warn: (...args: unknown[]) => errorLog(...args),
  error: (...args: unknown[]) => errorLog(...args),
};
const logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void } =
  (globalThis as any).logger ?? fallbackLogger;

const isProd = process.env.NODE_ENV === 'production';
const strict = (config.WAKU_STRICT || (isProd ? '1' : '0')) === '1';
export function isWakuDisabled(): boolean {
  // In tests, always enable Waku path to validate logging behaviors
  if (process.env.JEST_WORKER_ID) return false;
  return (
    config.WAKU_DISABLE === '1' ||
    config.EXPO_PUBLIC_WAKU_DISABLE === '1'
  );
}

const PUB =
  config.WAKU_PUBLISHER_KEY ||
  config.EXPO_PUBLIC_WAKU_PUBLISHER_KEY ||
  '';

let cachedNode: LightNode | null = null;
export const RECEIVED_ID_TTL_MS = 5 * 60 * 1000;
const RECEIVED_ID_MAX_ENTRIES = 1024;
const receivedIds = new Map<string, number>();
let reconnectAttempt = 0;
let lakeStarted = false;

const MAX_GZ_PAYLOAD = 200 * 1024; // 200KB
const PROMPT_TTI_MS = 2500; // 2.5s
const NONCE_BYTE_LENGTH = 12;
const KEY_EPOCH_INTERVAL_MS = 10 * 60 * 1000;
const PUBLISHER_KEY_STORAGE_KEY = 'waku_ephemeral_key';
const PUBLISHER_KEY_GLOBAL_SYMBOL = Symbol.for('waku.publisherKey');

type WakuClient = Awaited<ReturnType<typeof getClient>>;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(byteLength = NONCE_BYTE_LENGTH): string {
  return toHex(randomBytes(byteLength));
}

function isReactNativeEnv(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.product === 'string' &&
    navigator.product === 'ReactNative'
  );
}

function getGlobalPublisherKey(): string | null {
  const globalKey = (globalThis as Record<PropertyKey, unknown>)[
    PUBLISHER_KEY_GLOBAL_SYMBOL
  ];
  return typeof globalKey === 'string' ? globalKey : null;
}

function cachePublisherKey(key: string): string {
  (globalThis as Record<PropertyKey, unknown>)[
    PUBLISHER_KEY_GLOBAL_SYMBOL
  ] = key;
  cachedPublisherKey = key;
  return key;
}

async function randomBytesReactNative(): Promise<Uint8Array> {
  try {
    const randomModule: typeof import('expo-random') = await import(
      'expo-random'
    );
    if (typeof randomModule.getRandomBytesAsync === 'function') {
      const result = await randomModule.getRandomBytesAsync(32);
      if (result instanceof Uint8Array) return result;
      if (Array.isArray(result)) return Uint8Array.from(result);
    }
  } catch (err) {
    logger.warn({ err }, 'expo-random unavailable for RN key generation');
  }
  try {
    await import('react-native-get-random-values');
    const cryptoLike = (
      globalThis as { crypto?: { getRandomValues?: (arr: Uint8Array) => void } }
    ).crypto;
    if (cryptoLike && typeof cryptoLike.getRandomValues === 'function') {
      const arr = new Uint8Array(32);
      cryptoLike.getRandomValues(arr);
      return arr;
    }
  } catch (err) {
    logger.warn(
      { err },
      'react-native-get-random-values unavailable for RN key generation'
    );
  }
  return randomBytes(32);
}

function randomBytesBrowser(): Uint8Array {
  const cryptoLike = (
    globalThis as { crypto?: { getRandomValues?: (arr: Uint8Array) => void } }
  ).crypto;
  if (cryptoLike && typeof cryptoLike.getRandomValues === 'function') {
    const arr = new Uint8Array(32);
    cryptoLike.getRandomValues(arr);
    return arr;
  }
  return randomBytes(32);
}

function ensureHexKey(bytes: Uint8Array): string {
  return `hex:${toHex(bytes)}`;
}

async function loadReactNativePublisherKey(): Promise<string | null> {
  try {
    const secureStore: typeof import('expo-secure-store') = await import(
      'expo-secure-store'
    );
    const existing = await secureStore.getItemAsync(PUBLISHER_KEY_STORAGE_KEY);
    if (existing) return cachePublisherKey(existing);
    const bytes = await randomBytesReactNative();
    const key = ensureHexKey(bytes);
    await secureStore.setItemAsync(PUBLISHER_KEY_STORAGE_KEY, key);
    return cachePublisherKey(key);
  } catch (err) {
    logger.warn({ err }, 'Failed to resolve React Native publisher key');
    return null;
  }
}

function resolveBrowserPublisherKey(): string | null {
  try {
    if (
      typeof window === 'undefined' ||
      typeof window.localStorage === 'undefined'
    ) {
      return null;
    }
    const existing = window.localStorage.getItem(PUBLISHER_KEY_STORAGE_KEY);
    if (existing) return cachePublisherKey(existing);
    const key = ensureHexKey(randomBytesBrowser());
    window.localStorage.setItem(PUBLISHER_KEY_STORAGE_KEY, key);
    return cachePublisherKey(key);
  } catch (err) {
    logger.warn({ err }, 'Failed to use localStorage for publisher key');
    return null;
  }
}

function resolveNodePublisherKey(): string | null {
  try {
    const nodeCrypto: typeof import('crypto') = require('crypto');
    const key = `hex:${nodeCrypto.randomBytes(32).toString('hex')}`;
    return cachePublisherKey(key);
  } catch (err) {
    logger.warn({ err }, 'Failed to use node crypto for publisher key');
    return null;
  }
}

function resolveFallbackPublisherKey(): string {
  const existing = getGlobalPublisherKey();
  if (existing) return existing;
  return cachePublisherKey(ensureHexKey(randomBytes(32)));
}

type PublisherKeyResolver = () => string | null | Promise<string | null>;

const publisherKeyResolvers: PublisherKeyResolver[] = [
  () => {
    const globalKey = getGlobalPublisherKey();
    return globalKey ? cachePublisherKey(globalKey) : null;
  },
  async () => (isReactNativeEnv() ? loadReactNativePublisherKey() : null),
  () => resolveBrowserPublisherKey(),
  () => resolveNodePublisherKey(),
];

async function computePublisherKey(): Promise<string> {
  if (PUB) return cachePublisherKey(PUB);
  if (strict) throw new Error('WAKU_PUBLISHER_KEY required in strict/prod.');
  for (const resolveKey of publisherKeyResolvers) {
    const key = await resolveKey();
    if (key) return key;
  }
  return resolveFallbackPublisherKey();
}

let cachedPublisherKey: string | null = null;
let publisherKeyPromise: Promise<string> | null = null;
type PersistStoreFn = (storeId: string, store: Store) => Promise<void>;

let persistStoreImpl: PersistStoreFn | null = null;

async function persistStore(storeId: string, store: Store): Promise<void> {
  if (!persistStoreImpl) {
    try {
      const mod = await import('@/features/stores/services/nearStores');
      const service = mod.createStoreService(mod.createDefaultStoreServiceDeps());
      persistStoreImpl = service.setStore.bind(service) as PersistStoreFn;
    } catch (err) {
      errorLog('Failed to load store persistence module', err);
      return;
    }
  }
  try {
    await persistStoreImpl?.(storeId, store);
  } catch (err) {
    errorLog('Failed to persist store from lake event', err);
  }
}

function pruneReceivedIds(now: number): void {
  if (receivedIds.size === 0) return;
  for (const [id, seenAt] of receivedIds) {
    if (now - seenAt > RECEIVED_ID_TTL_MS) {
      receivedIds.delete(id);
    } else {
      break;
    }
  }
}

function rememberMessageId(id: string, now: number): boolean {
  if (receivedIds.has(id)) return false;
  receivedIds.set(id, now);
  while (receivedIds.size > RECEIVED_ID_MAX_ENTRIES) {
    const oldest = receivedIds.keys().next().value;
    if (oldest === undefined) break;
    receivedIds.delete(oldest);
  }
  return true;
}

function computeKeyEpoch(ts: number): number {
  if (!Number.isFinite(ts)) return 0;
  return Math.floor(ts / KEY_EPOCH_INTERVAL_MS);
}

function enrichEnvelope(message: unknown): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  if (message && typeof message === 'object' && !Array.isArray(message)) {
    Object.assign(base, message as Record<string, unknown>);
  } else if (message !== undefined) {
    base.payload = message;
  }
  const ts = typeof base.ts === 'number' ? base.ts : Date.now();
  const nonce = typeof base.nonce === 'string' ? base.nonce : randomHex();
  const keyEpoch =
    typeof base.keyEpoch === 'number' ? base.keyEpoch : computeKeyEpoch(ts);
  return { ...base, ts, nonce, keyEpoch };
}

export async function getPublisherKey(): Promise<string> {
  if (cachedPublisherKey) return cachedPublisherKey;
  if (!publisherKeyPromise) {
    publisherKeyPromise = computePublisherKey();
  }
  const key = await publisherKeyPromise;
  cachedPublisherKey = key;
  return key;
}

async function startNode(): Promise<LightNode | null> {
  await getPublisherKey();
  const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
  let node: LightNode | null = null;
  try {
    // TODO:CORE-022 Angle 1 - Insert the orders pipeline handshake before node start once the coordination spec is ready.
    node = await createLightNode({} as any);
  } catch (err) {
    errorLog('Failed to start Waku node', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) errorLog(err.stack);
    throw err;
  }
  if (!node) return null;
  node.libp2p.addEventListener('peer:disconnect', () => {
    cachedNode = null;
    scheduleReconnect();
  });
  await node.start();
  await waitForRemotePeer(node, [Protocols.Relay, Protocols.Store]);
  const client = await getClient();
  await flush(async (topic, payload) => {
    const encoder = client.createEncoder({ contentTopic: topic } as any);
    await node.lightPush.send(encoder, { payload });
  });
  reconnectAttempt = 0;
  if (!lakeStarted && config.NEAR_LAKE_BUCKET) {
    try {
      initLake({
        s3BucketName: config.NEAR_LAKE_BUCKET,
        s3RegionName: config.NEAR_LAKE_REGION || 'eu-central-1',
        startBlockHeight: BigInt(config.NEAR_LAKE_START_BLOCK || '0'),
        onBlock: handleLakeBlock,
      });
      lakeStarted = true;
    } catch (err) {
      logger.error({ err }, 'Failed to start NEAR Lake');
    }
  }
  return node;
}

function scheduleReconnect(attempt = 0): void {
  reconnectAttempt = attempt;
  const delay = Math.min(30000, 1000 * 2 ** attempt);
  setTimeout(async () => {
    try {
      cachedNode = await startNode();
      if (!cachedNode) throw new Error('no node');
    } catch {
      cachedNode = null;
      scheduleReconnect(attempt + 1);
    }
  }, delay);
}

export async function ensureNode(): Promise<LightNode | null> {
  if (isWakuDisabled()) return null;
  if (cachedNode) return cachedNode;
  const end = serviceLatency.startTimer({ service: 'waku.ensureNode' });
  try {
    if (process.env.JEST_WORKER_ID) {
      try {
        cachedNode = await startNode();
        logger.info({ service: 'waku.ensureNode' }, 'Waku node started');
        return cachedNode;
      } catch (err) {
        try {
          // Use require to ensure Jest mock is applied
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const loggerMock = require('@/utils/logger');
          loggerMock.errorLog('Failed to start Waku node', err instanceof Error ? err.message : err);
          if (err instanceof Error && err.stack) {
            loggerMock.errorLog(err.stack);
          }
        } catch {
          errorLog('Failed to start Waku node', err instanceof Error ? err.message : err);
        }
        cachedNode = null;
        return null;
      }
    } else {
      cachedNode = await retryWithBackoff(startNode);
      logger.info({ service: 'waku.ensureNode' }, 'Waku node started');
      return cachedNode;
    }
  } catch (err) {
    serviceFailures.inc({ service: 'waku.ensureNode' });
    errorLog('Failed to start Waku node', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) {
      errorLog(err.stack);
    }
    logger.error({ err }, 'Failed to start Waku node');
    cachedNode = null;
    return null;
  } finally {
    end();
  }
}

async function sendAck(topic: string, id: string): Promise<void> {
  const node = await ensureNode();
  if (!node) return;
  const client = await getClient();
  const encoder = client.createEncoder({
    contentTopic: `${topic}/ack`,
  } as any);
  await node.lightPush.send(encoder, {
    payload: client.utf8ToBytes(canonicalJson({ id })),
  });
}

async function decodeWakuPayload(
  topic: string,
  payload: Uint8Array,
  client: WakuClient,
): Promise<any | null> {
  try {
    const allowedEpochs = getSupportedKeyEpochs();
    const { plaintext } = await decrypt(topic, payload, { allowedEpochs });
    try {
      return JSON.parse(client.bytesToUtf8(plaintext));
    } catch {
      wakuDecryptErrorCounter.inc({ reason: 'decode_failure' });
      return null;
    }
  } catch (err) {
    if (err instanceof WakuDecryptError) {
      wakuDecryptErrorCounter.inc({ reason: err.code });
    } else {
      wakuDecryptErrorCounter.inc({ reason: 'unknown' });
    }
    return null;
  }
}

export async function publish(topic: string, message: any): Promise<string> {
  const client = await getClient();
  const id = message?.id || Date.now().toString();
  const enriched = enrichEnvelope(message);
  const baseEpoch =
    typeof enriched.keyEpoch === 'number' && Number.isFinite(enriched.keyEpoch)
      ? enriched.keyEpoch
      : getCurrentKeyEpoch();
  const envelope = { ...enriched, id, keyEpoch: baseEpoch };
  const payload = client.utf8ToBytes(canonicalJson(envelope));
  const gzSize = gzipSize(payload);
  if (gzSize > MAX_GZ_PAYLOAD) {
    throw new Error('Payload exceeds 200KB gz limit');
  }
  const useSharedKeys = baseEpoch > 0;
  const encryption = await encrypt(topic, payload, {
    keyEpoch: baseEpoch,
    dualWrite: useSharedKeys,
  });
  const envelopes = [encryption.primary, ...(encryption.legacy ? [encryption.legacy] : [])];
  const unsent = new Set<number>(envelopes.map((_, index) => index));

  try {
    const node = await ensureNode();
    if (!node) throw new Error('Waku disabled');
    const encoder = client.createEncoder({ contentTopic: topic } as any);
    for (let i = 0; i < envelopes.length; i += 1) {
      const entry = envelopes[i];
      try {
        await Promise.race([
          node.lightPush.send(encoder, { payload: entry.payload }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TTI_EXCEEDED')), PROMPT_TTI_MS),
          ),
        ]);
        unsent.delete(i);
      } catch {
        break;
      }
    }
  } catch {
    // fall through to queue unsent envelopes
  }

  if (unsent.size > 0) {
    for (const index of unsent) {
      enqueue(topic, envelopes[index].payload);
    }
  }
  return id;
}

export async function subscribeWithAck(
  topic: string,
  cb: (msg: any) => void,
): Promise<() => void> {
  const node = await ensureNode();
  if (!node) return () => {};
  const client = await getClient();
  const decoder = client.createDecoder(topic, undefined as any);
  const handler = async (wakuMsg: any) => {
    if (!wakuMsg.payload) return;
    try {
      const msg = await decodeWakuPayload(topic, wakuMsg.payload, client);
      if (!msg) return;
      const now = Date.now();
      pruneReceivedIds(now);
      if (msg.id && !rememberMessageId(msg.id, now)) return;
      cb(msg);
      if (msg.id) await sendAck(topic, msg.id);
    } catch {
      wakuDecryptErrorCounter.inc({ reason: 'unknown' });
    }
  };
  const maybeUnsub = (node.relay as any).addObserver(handler, [decoder]) as
    | (() => void)
    | void;
  return () => {
    if (typeof maybeUnsub === 'function') {
      maybeUnsub();
    } else {
      (node.relay as any)?.deleteObserver?.(handler);
    }
  };
}

export async function fetchHistory(
  topic: string,
  cb: (msg: any) => void,
): Promise<void> {
  const node = await ensureNode();
  if (!node) return;
  const client = await getClient();
  const decoder = client.createDecoder(topic, undefined as any);
  let cursor: any = undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await (node.store as any).queryHistory(decoder, { cursor });
    const messages = res.messages || [];
    for (const wakuMsg of messages) {
      if (!wakuMsg.payload) continue;
      const msg = await decodeWakuPayload(topic, wakuMsg.payload, client);
      if (msg) cb(msg);
    }
    if (!res.next) break;
    cursor = res.next;
  }
}

const dedupe = new Set<string>();
let lastHeight = 0;

function dedupeKey(tx: string, i: number) {
  return `${tx}:${i}`;
}

async function handleLakeBlock(msg: types.StreamerMessage) {
  const network = getNetworkId() || 'testnet';
  const contract = getContractId();
  const blockHeight = msg.block.header.height;
  if (blockHeight <= lastHeight) dedupe.clear();
  lastHeight = blockHeight;
  for (const shard of msg.shards) {
    for (const reo of shard.receiptExecutionOutcomes) {
      if (contract && reo.receipt?.receiverId !== contract) continue;
      const tx = reo.executionOutcome.id;
      const logs = reo.executionOutcome.outcome.logs || [];
      for (let i = 0; i < logs.length; i++) {
        const key = dedupeKey(tx, i);
        if (dedupe.has(key)) continue;
        try {
          const evt = JSON.parse(logs[i]);
          if (!evt?.event || !evt.storeId) continue;
          const base = {
            v: 1,
            storeId: evt.storeId,
            itemId: evt.itemId,
            seller: evt.seller,
            buyer: evt.buyer,
            priceYocto: evt.price ?? undefined,
            amount: evt.amount ?? undefined,
            tx,
            ts: Date.now(),
            event: evt.event,
          };
          if (evt.event === 'listing_added') {
            await publish(topicFor(network, base.storeId, 'listings'), base);
          } else if (evt.event === 'order_paid') {
            await publish(topicFor(network, base.storeId, 'orders'), base);
          } else if (evt.event === 'store_created') {
            try {
              const storeId = evt.storeId || base.storeId;
              const owner = evt.owner;
              const name = evt.name || `Store ${storeId}`;
              if (storeId && owner) {
                const store: Store = {
                  id: storeId,
                  name,
                  owner,
                  nftId: storeId,
                  reputation: 0,
                };
                await persistStore('default', store);
                await persistStore(storeId, store);
              }
            } catch {}
          }
          dedupe.add(key);
        } catch {
          /* ignore malformed log */
        }
      }
    }
  }
}

// Expose internals for testing
export const __test__ = { startNode, scheduleReconnect };







