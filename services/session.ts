import { EventEmitter } from 'events';
import { uuid } from '@/utils/uuid';
import { saveSession, loadSessions, removeSession } from '@/services/tokenCache';
import { requestConsent } from '@/services/consent';
import {
  authRateLimitCounter,
  authScopeRequestCounter,
  authInvalidScopeCounter,
} from '@/services/monitoring';

export const sessionEvents = new EventEmitter();

const POLICY = new Set<string>(['read', 'write']);

// Allow a small amount of clock skew when validating expirations
const CLOCK_TOLERANCE_MS = 60 * 1000; // 1 minute

export interface EncryptedScopePayload {
  cipher: string;
  walletPublicKey: string;
  identityPublicKey: string;
}

export interface SessionToken {
  token: string;
  scopes: string[];
  exp: number;
  sealed?: EncryptedScopePayload;
}

export interface ScopeRequestOptions {
  sealed?: EncryptedScopePayload | (() => EncryptedScopePayload | undefined);
}

export type SyncSessionSigner = (message: string) => string;
export type AsyncSessionSigner = (message: string) => Promise<string>;
export type SessionSigner = SyncSessionSigner | AsyncSessionSigner;

function isPromise<T>(value: unknown): value is Promise<T> {
  return typeof value === 'object' && value !== null && typeof (value as any).then === 'function';
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const rateLimitQueue: number[] = [];

function assertRateLimit(): void {
  const now = Date.now();
  while (rateLimitQueue.length && rateLimitQueue[0] <= now - RATE_LIMIT_WINDOW_MS) {
    rateLimitQueue.shift();
  }
  if (rateLimitQueue.length >= RATE_LIMIT_MAX_REQUESTS) {
    authRateLimitCounter.inc();
    throw new Error('{E_RATE_LIMIT}');
  }
  rateLimitQueue.push(now);
}

function validateScopes(scopes: string[]): void {
  authScopeRequestCounter.inc();
  const invalid = scopes.find((s) => !POLICY.has(s));
  if (invalid) {
    authInvalidScopeCounter.inc();
    throw new Error('{E_SCOPE}');
  }
}

export function requestScopes(
  scopes: string[],
  signer: (message: string) => string,
  ttlMs?: number,
  options?: ScopeRequestOptions,
): SessionToken;
export function requestScopes(
  scopes: string[],
  signer: (message: string) => Promise<string>,
  ttlMs?: number,
  options?: ScopeRequestOptions,
): Promise<SessionToken>;
export function requestScopes(
  scopes: string[],
  signer: SessionSigner,
  ttlMs = 60 * 60 * 1000,
  options: ScopeRequestOptions = {},
): SessionToken | Promise<SessionToken> {
  assertRateLimit();
  validateScopes(scopes);
  const now = Date.now();
  const exp = ttlMs < 0 ? now - CLOCK_TOLERANCE_MS - 1 : now + ttlMs;
  const payload = JSON.stringify({ scopes, exp });

  const persist = (maybeToken: string | undefined): SessionToken => {
    const token = maybeToken || uuid();
    const sealed =
      typeof options.sealed === 'function' ? options.sealed() : options.sealed;
    const record: SessionToken = sealed
      ? { token, scopes, exp, sealed }
      : { token, scopes, exp };
    store.set(token, record);
    void saveSession(record);
    return record;
  };

  const signed = signer(payload);
  if (isPromise<string>(signed)) {
    return signed.then((token) => persist(token));
  }
  return persist(signed);
}

const store = new Map<string, SessionToken>();
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let sweepTimer: ReturnType<typeof setInterval> | null = null;

function purgeExpiredSessions(now = Date.now()): void {
  for (const [token, rec] of [...store.entries()]) {
    if (now > rec.exp + CLOCK_TOLERANCE_MS) {
      store.delete(token);
      void removeSession(token);
    }
  }
}

export async function initSessionTokens(): Promise<void> {
  const records = await loadSessions();
  const now = Date.now();
  for (const r of records) {
    if (now > r.exp + CLOCK_TOLERANCE_MS) {
      void removeSession(r.token);
      continue;
    }
    store.set(r.token, r);
  }
  if (!sweepTimer) {
    sweepTimer = setInterval(purgeExpiredSessions, SWEEP_INTERVAL_MS);
    if (typeof (sweepTimer as any).unref === 'function') {
      (sweepTimer as any).unref();
    }
  }
}

export function validateToken(token: string, requiredScopes: string[]): void {
  const rec = store.get(token);
  if (!rec) throw new Error('{E_EXPIRED}');
  if (Date.now() > rec.exp + CLOCK_TOLERANCE_MS) {
    store.delete(token);
    throw new Error('{E_EXPIRED}');
  }
  validateScopes(requiredScopes);
  const missing = requiredScopes.find((s) => !rec.scopes.includes(s));
  if (missing) throw new Error('{E_SCOPE}');
}

export function refreshToken(
  token: string,
  signer: (message: string) => string,
  ttlMs?: number,
  options?: ScopeRequestOptions,
): SessionToken;
export function refreshToken(
  token: string,
  signer: (message: string) => Promise<string>,
  ttlMs?: number,
  options?: ScopeRequestOptions,
): Promise<SessionToken>;
export function refreshToken(
  token: string,
  signer: SessionSigner,
  ttlMs = 60 * 60 * 1000,
  options: ScopeRequestOptions = {},
): SessionToken | Promise<SessionToken> {
  const rec = store.get(token);
  if (!rec) throw new Error('{E_EXPIRED}');
  if (Date.now() > rec.exp + CLOCK_TOLERANCE_MS) {
    store.delete(token);
    throw new Error('{E_EXPIRED}');
  }

  const handleNext = (next: SessionToken): SessionToken => {
    store.delete(token);
    void removeSession(token);
    sessionEvents.emit('token.rotated', { old: token, token: next.token });
    return next;
  };

  const next = (requestScopes as (
    scopes: string[],
    signer: SessionSigner,
    ttlMs?: number,
    options?: ScopeRequestOptions,
  ) => SessionToken | Promise<SessionToken>)(rec.scopes, signer, ttlMs, options);
  if (isPromise<SessionToken>(next)) {
    return next.then(handleNext);
  }
  return handleNext(next);
}

export async function requestTokenWithConsent(
  scopes: string[],
  signer: SessionSigner,
  ttlMs = 60 * 60 * 1000,
  options: ScopeRequestOptions = {},
): Promise<SessionToken> {
  const ok = await requestConsent(scopes);
  if (!ok) throw new Error('{E_DENIED}');
  const issued = (requestScopes as (
    scopes: string[],
    signer: SessionSigner,
    ttlMs?: number,
    options?: ScopeRequestOptions,
  ) => SessionToken | Promise<SessionToken>)(scopes, signer, ttlMs, options);
  return await issued;
}

export function getSession(token: string): SessionToken | undefined {
  return store.get(token);
}

export async function revokeToken(token: string): Promise<void> {
  store.delete(token);
  await removeSession(token);
}

export function sweepExpiredTokens(now = Date.now()): void {
  purgeExpiredSessions(now);
}

