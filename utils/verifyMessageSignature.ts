import { verify } from '@noble/ed25519';
import type { WakuMessage } from '../types/waku';
import { canonicalJson } from './serialization';
import { z } from 'zod';
import { errorLog } from './logger';
import { wakuReplayDrops } from './observability';

export const TIMESTAMP_TOLERANCE_MS = 2 * 60 * 1000; // 2 minutes
const REPLAY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REPLAY_CACHE_MAX = 2048;

type ReplayEntry = { seenAt: number };

const replayCache = new Map<string, ReplayEntry>();

function pruneReplayCache(now: number): void {
  for (const [key, entry] of replayCache) {
    if (now - entry.seenAt > REPLAY_CACHE_TTL_MS) {
      replayCache.delete(key);
    } else {
      break;
    }
  }
}

function storeReplayKey(key: string, now: number): void {
  replayCache.delete(key);
  replayCache.set(key, { seenAt: now });
  if (replayCache.size > REPLAY_CACHE_MAX) {
    const oldest = replayCache.keys().next().value;
    if (oldest) replayCache.delete(oldest);
  }
}

function extractPayloadObject(payload: unknown): Record<string, unknown> | null {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function extractReplayMetadata(message: WakuMessage<unknown>): {
  ts: number | null;
  nonce: string | null;
} {
  const payload = extractPayloadObject(message.payload);
  const payloadTs = payload && typeof payload.ts === 'number'
    ? payload.ts
    : payload && typeof payload.timestamp === 'number'
      ? payload.timestamp
      : null;
  const payloadNonce = payload && typeof payload.nonce === 'string' ? payload.nonce : null;
  const envelopeTs = typeof (message as any).ts === 'number' ? (message as any).ts : null;
  const envelopeNonce = typeof (message as any).nonce === 'string' ? (message as any).nonce : null;
  return {
    ts: payloadTs ?? envelopeTs,
    nonce: payloadNonce ?? envelopeNonce,
  };
}

export async function verifyMessageSignature<T>(
  message: WakuMessage<T>,
  publicKey: string,
): Promise<boolean> {
  try {
    const msgBytes = new TextEncoder().encode(
      canonicalJson({
        type: message.type,
        payload: message.payload,
        sender: message.sender,
      }),
    );
    const sigBytes = Uint8Array.from(
      Buffer.from(message.signature.replace(/^0x/, ''), 'hex'),
    );
    const pubBytes = Uint8Array.from(
      Buffer.from(publicKey.replace(/^0x/, ''), 'hex'),
    );
    return await verify(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}

export async function verifyBeforeWrite<T>(
  data: unknown,
  schema: z.ZodType<WakuMessage<T>>,
  allowedPublicKeys?: string[],
  topic?: string,
): Promise<WakuMessage<T> | null> {
  const res = schema.safeParse(data);
  if (!res.success) {
    errorLog('Invalid Waku message');
    return null;
  }
  const msg = res.data;
  const ok = await verifyMessageSignature(msg, msg.sender.publicKey);
  if (!ok) {
    errorLog('E_SIGNATURE_INVALID');
    return null;
  }
  if (allowedPublicKeys && !allowedPublicKeys.includes(msg.sender.publicKey)) {
    errorLog('E_UNAUTHORIZED');
    return null;
  }
  const { ts, nonce } = extractReplayMetadata(msg);
  if (typeof ts === 'number') {
    const skew = Math.abs(Date.now() - ts);
    if (skew > TIMESTAMP_TOLERANCE_MS) {
      errorLog('E_TIMESTAMP_SKEW');
      wakuReplayDrops.inc({ reason: 'skew' });
      return null;
    }
  } else {
    wakuReplayDrops.inc({ reason: 'missing_ts' });
    errorLog('E_TIMESTAMP_SKEW');
    return null;
  }
  if (!nonce) {
    wakuReplayDrops.inc({ reason: 'missing_nonce' });
    errorLog('E_REPLAY');
    return null;
  }
  if (topic) {
    const now = Date.now();
    pruneReplayCache(now);
    const key = `${topic}|${msg.sender.publicKey}|${nonce}`;
    if (replayCache.has(key)) {
      wakuReplayDrops.inc({ reason: 'duplicate' });
      errorLog('E_REPLAY');
      return null;
    }
    storeReplayKey(key, now);
  }
  return msg;
}
