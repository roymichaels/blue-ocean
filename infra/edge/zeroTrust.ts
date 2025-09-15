import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Buffer } from 'buffer';
import pino from 'pino';
import { VaultClient } from './vaultClient';
import type {
  ZeroTrustAuthorizeOptions,
  ZeroTrustFunctionDefinition,
  ZeroTrustRuntime,
  ZeroTrustAuthContext,
} from './types';
import { LocalMetricRegistry } from '@/utils/localMetrics';

const DEFAULT_CLOCK_SKEW_MS = 30_000;
const DEFAULT_NONCE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_KEY_CACHE_MS = 15_000;

const nonceCache = new Map<string, number>();
const keyCache = new Map<string, { keys: SanitizedKey[]; expiresAt: number }>();

const logger = pino({ name: 'edge' });
const metrics = new LocalMetricRegistry();

const requestLatency = metrics.createHistogram({
  name: 'edge_request_latency_ms',
  help: 'Latency of edge functions protected by zero-trust auth',
  labelNames: ['function', 'outcome'],
});

const authFailures = metrics.createCounter({
  name: 'edge_auth_failures_total',
  help: 'Unauthorized requests rejected at the edge',
  labelNames: ['function'],
});

const nonceReplays = metrics.createCounter({
  name: 'edge_nonce_reuse_total',
  help: 'Replay attempts detected via nonce reuse',
  labelNames: ['function'],
});

type SanitizedKey = {
  id: string;
  secret: string;
  expiresAt: string;
  metadata?: Record<string, string>;
};

class EdgeAuthorizationError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = 'E_UNAUTHORIZED', status = 401) {
    super(message);
    this.name = 'EdgeAuthorizationError';
    this.code = code;
    this.status = status;
  }
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function cleanupNonceCache(nowMs: number) {
  for (const [key, expiry] of nonceCache) {
    if (expiry <= nowMs) {
      nonceCache.delete(key);
    }
  }
}

function trackNonce(
  functionName: string,
  keyId: string,
  nonce: string,
  ttlMs: number,
  nowMs: number,
) {
  cleanupNonceCache(nowMs);
  const cacheKey = `${keyId}:${nonce}`;
  const expiresAt = nowMs + ttlMs;
  const existing = nonceCache.get(cacheKey);
  if (existing && existing > nowMs) {
    nonceReplays.inc({ function: functionName });
    throw new EdgeAuthorizationError('nonce already used', 'E_REPLAY', 401);
  }
  nonceCache.set(cacheKey, expiresAt);
}

async function loadKeys(
  vault: VaultClient,
  functionName: string,
  authorize: ZeroTrustAuthorizeOptions,
  cacheTtlMs: number,
  now: Date,
): Promise<SanitizedKey[]> {
  const cached = keyCache.get(functionName);
  const nowMs = now.getTime();
  if (cached && cached.expiresAt > nowMs) {
    return cached.keys;
  }
  const grace = authorize.gracePeriodMs ?? DEFAULT_NONCE_TTL_MS;
  const keys = await vault.getVerificationKeys(functionName, now, grace);
  const sanitized = keys.map((key) => ({
    id: key.id,
    secret: key.secret,
    expiresAt: key.expiresAt,
    metadata: key.metadata ? { ...key.metadata } : undefined,
  }));
  keyCache.set(functionName, {
    keys: sanitized,
    expiresAt: nowMs + cacheTtlMs,
  });
  return sanitized;
}

function verifySignature(
  canonical: string,
  signature: string,
  secret: string,
): boolean {
  const mac = createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(canonical)
    .digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'base64');
  } catch {
    return false;
  }
  if (mac.length !== provided.length) return false;
  return timingSafeEqual(mac, provided);
}

async function authorizeRequest(
  definition: ZeroTrustFunctionDefinition,
  request: Request,
  vault: VaultClient,
  authorize: ZeroTrustAuthorizeOptions,
  cacheTtlMs: number,
  now: Date,
): Promise<ZeroTrustAuthContext> {
  const { name } = definition;
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Edge ')) {
    throw new EdgeAuthorizationError('missing authorization header');
  }
  const token = authHeader.slice('Edge '.length).trim();
  const [keyId, signature] = token.split(':');
  if (!keyId || !signature) {
    throw new EdgeAuthorizationError('malformed authorization token');
  }

  const timestampHeader = request.headers.get('x-edge-timestamp');
  const nonce = request.headers.get('x-edge-nonce');
  const digestHeader = request.headers.get('x-edge-digest');
  if (!timestampHeader || !nonce || !digestHeader) {
    throw new EdgeAuthorizationError('missing integrity headers');
  }
  const issuedAt = Number(timestampHeader);
  if (!Number.isFinite(issuedAt)) {
    throw new EdgeAuthorizationError('invalid timestamp header');
  }
  const nowMs = now.getTime();
  const skewLimit = authorize.clockSkewMs ?? DEFAULT_CLOCK_SKEW_MS;
  if (Math.abs(nowMs - issuedAt) > skewLimit) {
    throw new EdgeAuthorizationError('timestamp outside allowed clock skew');
  }

  const clone = request.clone();
  const bodyBuffer = await clone.arrayBuffer();
  const computedDigest = toHex(createHash('sha256').update(Buffer.from(bodyBuffer)).digest());
  if (computedDigest !== digestHeader) {
    throw new EdgeAuthorizationError('payload digest mismatch');
  }

  const url = new URL(request.url);
  const canonical = [
    request.method.toUpperCase(),
    `${url.pathname}${url.search}`,
    String(issuedAt),
    nonce,
    computedDigest,
  ].join('\n');

  const ttl = authorize.nonceTtlMs ?? DEFAULT_NONCE_TTL_MS;
  const keys = await loadKeys(vault, name, authorize, cacheTtlMs, now);
  for (const key of keys) {
    if (key.id !== keyId) continue;
    const expiry = new Date(key.expiresAt).getTime();
    if (expiry < nowMs) continue;
    if (!verifySignature(canonical, signature, key.secret)) {
      continue;
    }
    trackNonce(name, key.id, nonce, ttl, nowMs);
    return {
      keyId,
      nonce,
      issuedAt: new Date(issuedAt),
      expiresAt: new Date(key.expiresAt),
      metadata: key.metadata,
    };
  }

  keyCache.delete(name);
  const freshKeys = await loadKeys(vault, name, authorize, cacheTtlMs, now);
  for (const key of freshKeys) {
    if (key.id !== keyId) continue;
    const expiry = new Date(key.expiresAt).getTime();
    if (expiry < nowMs) continue;
    if (!verifySignature(canonical, signature, key.secret)) {
      continue;
    }
    trackNonce(name, key.id, nonce, ttl, nowMs);
    return {
      keyId,
      nonce,
      issuedAt: new Date(issuedAt),
      expiresAt: new Date(key.expiresAt),
      metadata: key.metadata,
    };
  }

  throw new EdgeAuthorizationError('signature verification failed');
}

export interface ZeroTrustFunctionOptions {
  vault: VaultClient;
  authorize?: ZeroTrustAuthorizeOptions;
  logger?: pino.Logger;
  cacheTtlMs?: number;
  metrics?: LocalMetricRegistry;
}

export function createZeroTrustFunction(
  definition: ZeroTrustFunctionDefinition,
  options: ZeroTrustFunctionOptions,
): ZeroTrustRuntime {
  const vault = options.vault;
  const authorize = options.authorize ?? {};
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_KEY_CACHE_MS;
  const runtimeLogger = (options.logger ?? logger).child({ function: definition.name });
  const handlerMetrics = options.metrics ?? metrics;

  return {
    name: definition.name,
    handle: async (request: Request, env?: Record<string, unknown>) => {
      const stopTimer = requestLatency.startTimer({
        function: definition.name,
      });
      try {
        const auth = await authorizeRequest(
          definition,
          request,
          vault,
          authorize,
          cacheTtlMs,
          new Date(),
        );
        const response = await definition.handler({
          request,
          env,
          logger: runtimeLogger,
          metrics: handlerMetrics,
          auth,
        });
        stopTimer({ outcome: 'success' });
        return response;
      } catch (err) {
        if (err instanceof EdgeAuthorizationError) {
          authFailures.inc({ function: definition.name });
          runtimeLogger.warn({ code: err.code }, 'edge request rejected');
          stopTimer({ outcome: 'unauthorized' });
          return new Response('unauthorized', { status: err.status });
        }
        runtimeLogger.error({ err }, 'edge function failed');
        stopTimer({ outcome: 'failure' });
        throw err;
      }
    },
  };
}

export function getEdgeMetricsRegistry(): LocalMetricRegistry {
  return metrics;
}

export function clearEdgeCaches(): void {
  nonceCache.clear();
  keyCache.clear();
}

export { logger as edgeLogger, metrics as edgeMetrics, requestLatency, authFailures, nonceReplays };
