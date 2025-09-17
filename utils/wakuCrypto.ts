import { xchacha20 } from '@noble/ciphers/chacha';
import { blake2b } from '@noble/hashes/blake2b';
import { randomBytes } from '@noble/hashes/utils';
import config from '@/config';
import { deriveSharedKeyRaw } from './encryption';
import { getEd25519KeyPair } from '@/services/localIdentity';
import { getAdminPublicKeys } from '@/services/nearSettings';

const SHARED_MAGIC = new Uint8Array([0x57, 0x53, 0x4b, 0x31]); // "WSK1"
const NONCE_LENGTH = 24;
const EPOCH_LENGTH = 4;
const SHARED_HEADER_LENGTH = SHARED_MAGIC.length + EPOCH_LENGTH + NONCE_LENGTH;

const legacyRootSecret = randomBytes(32);
const legacyTopicKeys = new Map<string, Uint8Array>();
const sharedKeyCache = new Map<string, Uint8Array>();
const sharedKeyPromises = new Map<string, Promise<Uint8Array>>();

let cachedTenantKey: string | null = null;
let tenantKeyPromise: Promise<string> | null = null;

const encoder = new TextEncoder();

class TenantKeyUnavailableError extends Error {
  constructor(message = 'Tenant public key unavailable') {
    super(message);
    this.name = 'TenantKeyUnavailableError';
  }
}

export type WakuDecryptErrorCode =
  | 'TENANT_KEY_UNAVAILABLE'
  | 'UNSUPPORTED_EPOCH'
  | 'KEY_DERIVATION_FAILED';

export class WakuDecryptError extends Error {
  readonly code: WakuDecryptErrorCode;

  constructor(code: WakuDecryptErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'WakuDecryptError';
  }
}

export interface EnvelopeOutput {
  payload: Uint8Array;
  keyEpoch: number | null;
  format: 'shared' | 'legacy';
}

export interface EncryptOutput {
  primary: EnvelopeOutput;
  legacy?: EnvelopeOutput;
}

export interface DecryptResult {
  plaintext: Uint8Array;
  keyEpoch: number | null;
  format: 'shared' | 'legacy';
}

export interface EncryptOptions {
  keyEpoch?: number | null;
  dualWrite?: boolean;
}

export interface DecryptOptions {
  allowedEpochs?: number[];
}

function parseEpoch(raw: string | undefined): number | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value) || Number.isNaN(value) || value < 0) {
    return null;
  }
  return value;
}

export function getCurrentKeyEpoch(): number {
  const publicEpoch = parseEpoch(config.EXPO_PUBLIC_WAKU_KEY_EPOCH);
  if (publicEpoch !== null) return publicEpoch;
  const privateEpoch = parseEpoch(config.WAKU_KEY_EPOCH);
  return privateEpoch ?? 0;
}

export function getSupportedKeyEpochs(): number[] {
  const current = getCurrentKeyEpoch();
  const previous = current > 0 ? current - 1 : null;
  return previous !== null ? [current, previous] : [current];
}

function encodeEpoch(epoch: number): Uint8Array {
  const buffer = new ArrayBuffer(EPOCH_LENGTH);
  const view = new DataView(buffer);
  view.setUint32(0, epoch >>> 0, false);
  return new Uint8Array(buffer);
}

function decodeEpoch(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(0, false);
}

function legacyTopicKey(topic: string): Uint8Array {
  if (!legacyTopicKeys.has(topic)) {
    const topicBytes = encoder.encode(topic);
    const key = blake2b(Uint8Array.from([...legacyRootSecret, ...topicBytes]), { dkLen: 32 });
    legacyTopicKeys.set(topic, key);
  }
  return legacyTopicKeys.get(topic)!;
}

async function getTenantPublicKey(): Promise<string> {
  if (cachedTenantKey) return cachedTenantKey;
  if (tenantKeyPromise) return tenantKeyPromise;
  tenantKeyPromise = (async () => {
    const keys = await getAdminPublicKeys();
    const primary = keys[0];
    if (!primary) {
      throw new TenantKeyUnavailableError();
    }
    cachedTenantKey = primary;
    return primary;
  })();
  try {
    return await tenantKeyPromise;
  } catch (err) {
    tenantKeyPromise = null;
    cachedTenantKey = null;
    if (err instanceof TenantKeyUnavailableError) {
      throw err;
    }
    throw new TenantKeyUnavailableError(
      err instanceof Error ? err.message : 'Tenant public key unavailable',
    );
  }
}

async function deriveSharedTopicKey(topic: string, epoch: number): Promise<Uint8Array> {
  const cacheKey = `${topic}:${epoch}`;
  const cached = sharedKeyCache.get(cacheKey);
  if (cached) return cached;

  let promise = sharedKeyPromises.get(cacheKey);
  if (!promise) {
    promise = (async () => {
      const { privateKey } = await getEd25519KeyPair();
      const tenantPublicKey = await getTenantPublicKey();
      const salt = encodeEpoch(epoch);
      try {
        const derived = await deriveSharedKeyRaw(privateKey, tenantPublicKey, topic, salt);
        sharedKeyCache.set(cacheKey, derived);
        return derived;
      } catch (err) {
        throw new WakuDecryptError(
          'KEY_DERIVATION_FAILED',
          err instanceof Error ? err.message : 'Failed to derive shared key',
        );
      }
    })();
    sharedKeyPromises.set(cacheKey, promise);
    promise.finally(() => sharedKeyPromises.delete(cacheKey));
  }
  return promise;
}

function encodeSharedEnvelope(epoch: number, nonce: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  const buffer = new Uint8Array(SHARED_HEADER_LENGTH + ciphertext.length);
  let offset = 0;
  buffer.set(SHARED_MAGIC, offset);
  offset += SHARED_MAGIC.length;
  buffer.set(encodeEpoch(epoch), offset);
  offset += EPOCH_LENGTH;
  buffer.set(nonce, offset);
  offset += NONCE_LENGTH;
  buffer.set(ciphertext, offset);
  return buffer;
}

function decodeSharedEnvelope(payload: Uint8Array): {
  epoch: number;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
} | null {
  if (payload.length <= SHARED_HEADER_LENGTH) return null;
  for (let i = 0; i < SHARED_MAGIC.length; i += 1) {
    if (payload[i] !== SHARED_MAGIC[i]) return null;
  }
  const epochStart = SHARED_MAGIC.length;
  const epochBytes = payload.slice(epochStart, epochStart + EPOCH_LENGTH);
  const epoch = decodeEpoch(epochBytes);
  const nonceStart = epochStart + EPOCH_LENGTH;
  const nonce = payload.slice(nonceStart, nonceStart + NONCE_LENGTH);
  const ciphertext = payload.slice(nonceStart + NONCE_LENGTH);
  return { epoch, nonce, ciphertext };
}

function encryptLegacyEnvelope(topic: string, payload: Uint8Array): Uint8Array {
  const key = legacyTopicKey(topic);
  const nonce = randomBytes(NONCE_LENGTH);
  const enc = xchacha20(key, nonce, payload);
  const result = new Uint8Array(NONCE_LENGTH + enc.length);
  result.set(nonce, 0);
  result.set(enc, NONCE_LENGTH);
  return result;
}

function decryptLegacyEnvelope(topic: string, payload: Uint8Array): Uint8Array {
  const key = legacyTopicKey(topic);
  const nonce = payload.slice(0, NONCE_LENGTH);
  const data = payload.slice(NONCE_LENGTH);
  return xchacha20(key, nonce, data);
}

async function encryptSharedEnvelope(
  topic: string,
  payload: Uint8Array,
  epoch: number,
): Promise<Uint8Array> {
  const key = await deriveSharedTopicKey(topic, epoch);
  const nonce = randomBytes(NONCE_LENGTH);
  const enc = xchacha20(key, nonce, payload);
  return encodeSharedEnvelope(epoch, nonce, enc);
}

export async function encrypt(
  topic: string,
  payload: Uint8Array,
  options: EncryptOptions = {},
): Promise<EncryptOutput> {
  const { keyEpoch = null, dualWrite = false } = options;
  if (typeof keyEpoch === 'number') {
    try {
      const sharedPayload = await encryptSharedEnvelope(topic, payload, keyEpoch);
      const result: EncryptOutput = {
        primary: { payload: sharedPayload, keyEpoch, format: 'shared' },
      };
      if (dualWrite) {
        const legacyPayload = encryptLegacyEnvelope(topic, payload);
        result.legacy = { payload: legacyPayload, keyEpoch, format: 'legacy' };
      }
      return result;
    } catch (err) {
      if (err instanceof TenantKeyUnavailableError) {
        // fall back to legacy encryption below
      } else if (err instanceof WakuDecryptError) {
        if (err.code !== 'TENANT_KEY_UNAVAILABLE') {
          throw err;
        }
      } else if (err instanceof Error) {
        throw err;
      } else {
        throw new Error(String(err));
      }
    }
  }

  const legacyPayload = encryptLegacyEnvelope(topic, payload);
  return {
    primary: { payload: legacyPayload, keyEpoch: null, format: 'legacy' },
  };
}

export async function decrypt(
  topic: string,
  payload: Uint8Array,
  options: DecryptOptions = {},
): Promise<DecryptResult> {
  const meta = decodeSharedEnvelope(payload);
  const allowedEpochs = options.allowedEpochs ?? getSupportedKeyEpochs();

  if (meta) {
    if (!allowedEpochs.includes(meta.epoch)) {
      throw new WakuDecryptError('UNSUPPORTED_EPOCH', `Unsupported key epoch ${meta.epoch}`);
    }
    try {
      const key = await deriveSharedTopicKey(topic, meta.epoch);
      const plaintext = xchacha20(key, meta.nonce, meta.ciphertext);
      return { plaintext, keyEpoch: meta.epoch, format: 'shared' };
    } catch (err) {
      if (err instanceof TenantKeyUnavailableError) {
        throw new WakuDecryptError('TENANT_KEY_UNAVAILABLE', err.message);
      }
      if (err instanceof WakuDecryptError) {
        throw err;
      }
      throw new WakuDecryptError(
        'KEY_DERIVATION_FAILED',
        err instanceof Error ? err.message : 'Failed to derive shared key',
      );
    }
  }

  const legacyPlaintext = decryptLegacyEnvelope(topic, payload);
  return { plaintext: legacyPlaintext, keyEpoch: null, format: 'legacy' };
}

export default { encrypt, decrypt, getCurrentKeyEpoch, getSupportedKeyEpochs };
