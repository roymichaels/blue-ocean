import { EventEmitter } from 'events';
import { uuid } from '@/utils/uuid';
import { getDeviceHash } from '@/utils/getDeviceHash';
import { saveSession, loadSessions, removeSession } from '@/services/tokenCache';
import { requestConsent } from '@/services/consent';
import SettingsAgent from '@/agents/settings-agent';
import { chainAdapter } from '@/services/chain';
import type { AdminScope } from '@/types';
import { ALL_ADMIN_SCOPES } from '@/types';
import {
  authRateLimitCounter,
  authScopeRequestCounter,
  authInvalidScopeCounter,
} from '@/services/monitoring';
import { scopedTokensFlag } from '@/config/featureFlags';

export const sessionEvents = new EventEmitter();

export const CHECKOUT_SCOPE = 'checkout';
export const LEGACY_CHECKOUT_SCOPE = 'write';

const BASE_SCOPE_POLICY = new Set<string>(['read', LEGACY_CHECKOUT_SCOPE, CHECKOUT_SCOPE]);
const ADMIN_SCOPE_PREFIX = 'admin:';
const ADMIN_SCOPE_POLICY = new Set<AdminScope>(ALL_ADMIN_SCOPES);

// Allow a small amount of clock skew when validating expirations
const CLOCK_TOLERANCE_MS = 60 * 1000; // 1 minute

export interface EncryptedScopePayload {
  cipher: string;
  walletPublicKey: string;
  identityPublicKey: string;
  kycReceiptHash?: string;
}

export interface SessionToken {
  token: string;
  scopes: string[];
  exp: number;
  deviceHash: string;
  sealed?: EncryptedScopePayload;
  checkoutNonce?: string;
}

export interface ScopeRequestOptions {
  sealed?: EncryptedScopePayload | (() => EncryptedScopePayload | undefined);
  kycReceiptHash?: string;
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

export function isAdminScope(scope: string): boolean {
  return scope.startsWith(ADMIN_SCOPE_PREFIX);
}

function assertScopePolicy(scopes: string[]): AdminScope[] {
  authScopeRequestCounter.inc();
  const adminScopes: AdminScope[] = [];
  for (const scope of scopes) {
    if (BASE_SCOPE_POLICY.has(scope)) continue;
    if (isAdminScope(scope)) {
      if (!ADMIN_SCOPE_POLICY.has(scope as AdminScope)) {
        authInvalidScopeCounter.inc({ scope });
        throw new Error('{E_SCOPE}');
      }
      adminScopes.push(scope as AdminScope);
      continue;
    }
    authInvalidScopeCounter.inc({ scope });
    throw new Error('{E_SCOPE}');
  }
  return adminScopes;
}

async function ensureAdminScopes(scopes: AdminScope[]): Promise<void> {
  if (scopes.length === 0) return;
  const uniqueScopes = Array.from(new Set(scopes));
  const getter = chainAdapter.getAccountId;
  const actor = typeof getter === 'function' ? getter.call(chainAdapter) : null;
  if (!actor) {
    authInvalidScopeCounter.inc({ scope: uniqueScopes[0] });
    throw new Error('{E_SCOPE}');
  }
  const settings = SettingsAgent.getInstance();
  await Promise.all(
    uniqueScopes.map(async (scope) => {
      const allowed = await settings.hasAdminScope(actor, scope);
      if (!allowed) {
        authInvalidScopeCounter.inc({ scope });
        throw new Error('{E_SCOPE}');
      }
    }),
  );
}

function validateScopes(scopes: string[]): void | Promise<void> {
  const adminScopes = assertScopePolicy(scopes);
  if (adminScopes.length === 0) return;
  return ensureAdminScopes(adminScopes);
}

export function getCheckoutRequestScopes(): string[] {
  return scopedTokensFlag.rollback ? [LEGACY_CHECKOUT_SCOPE] : [CHECKOUT_SCOPE];
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
  const scopeValidation = validateScopes(scopes);

  const issueToken = (): SessionToken | Promise<SessionToken> => {
    const now = Date.now();
    const exp = ttlMs < 0 ? now - CLOCK_TOLERANCE_MS - 1 : now + ttlMs;
    const payload = JSON.stringify({ scopes, exp });
    const deviceHash = getDeviceHash();

    const persist = (maybeToken: string | undefined): SessionToken => {
      const token = maybeToken || uuid();
      const resolvedSealed =
        typeof options.sealed === 'function' ? options.sealed() : options.sealed;
      const receiptHash =
        typeof options.kycReceiptHash === 'string' && options.kycReceiptHash.length > 0
          ? options.kycReceiptHash
          : undefined;
      const sealed =
        resolvedSealed && receiptHash
          ? { ...resolvedSealed, kycReceiptHash: receiptHash }
          : resolvedSealed;
      const record: SessionToken = sealed
        ? { token, scopes, exp, sealed, deviceHash }
        : { token, scopes, exp, deviceHash };
      store.set(token, record);
      void saveSession(record);
      return record;
    };

    const signed = signer(payload);
    if (isPromise<string>(signed)) {
      return signed.then((token) => persist(token));
    }
    return persist(signed);
  };

  if (isPromise<void>(scopeValidation)) {
    return scopeValidation.then(() => issueToken());
  }
  return issueToken();
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
    if (typeof r.deviceHash !== 'string' || r.deviceHash.length === 0) {
      void removeSession(r.token);
      continue;
    }
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
  const deviceHash = getDeviceHash();
  if (rec.deviceHash !== deviceHash) {
    store.delete(token);
    void removeSession(token);
    throw new Error('{E_DEVICE_MISMATCH}');
  }
  assertScopePolicy(requiredScopes);
  const missing = requiredScopes.find((s) => !rec.scopes.includes(s));
  if (missing) throw new Error('{E_SCOPE}');
}

export function assertCheckoutScope(token: string): void {
  try {
    validateToken(token, [CHECKOUT_SCOPE]);
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === '{E_SCOPE}' &&
      scopedTokensFlag.rollback
    ) {
      validateToken(token, [LEGACY_CHECKOUT_SCOPE]);
      return;
    }
    throw err;
  }
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
  const deviceHash = getDeviceHash();
  if (rec.deviceHash !== deviceHash) {
    store.delete(token);
    void removeSession(token);
    throw new Error('{E_DEVICE_MISMATCH}');
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

export function setSessionCheckoutNonce(
  token: string,
  nonce: string | null,
): void {
  const session = store.get(token);
  if (!session) return;
  if (typeof nonce === 'string' && nonce.length > 0) {
    session.checkoutNonce = nonce;
  } else if ('checkoutNonce' in session) {
    delete session.checkoutNonce;
  }
  void saveSession(session);
}

export function getSessionCheckoutNonce(token: string): string | undefined {
  return store.get(token)?.checkoutNonce;
}

export async function revokeToken(token: string): Promise<void> {
  store.delete(token);
  await removeSession(token);
}

export function sweepExpiredTokens(now = Date.now()): void {
  purgeExpiredSessions(now);
}

