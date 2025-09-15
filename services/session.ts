import { EventEmitter } from 'events';
import { uuid } from '@/utils/uuid';
import { saveSession, loadSessions, removeSession } from '@/services/tokenCache';
import { requestConsent } from '@/services/consent';

export const sessionEvents = new EventEmitter();

const POLICY = new Set<string>(['read', 'write']);

export interface SessionToken {
  token: string;
  scopes: string[];
  exp: number;
}

function validateScopes(scopes: string[]): void {
  const invalid = scopes.find((s) => !POLICY.has(s));
  if (invalid) {
    throw new Error('{E_SCOPE}');
  }
}

export function requestScopes(
  scopes: string[],
  signer: (message: string) => string,
  ttlMs = 60 * 60 * 1000,
): SessionToken {
  validateScopes(scopes);
  const exp = Date.now() + ttlMs;
  const payload = JSON.stringify({ scopes, exp });
  const token = signer(payload) || uuid();
  const record: SessionToken = { token, scopes, exp };
  store.set(token, record);
  void saveSession(record);
  return record;
}

const store = new Map<string, SessionToken>();

export async function initSessionTokens(): Promise<void> {
  const records = await loadSessions();
  for (const r of records) {
    store.set(r.token, r);
  }
}

export function validateToken(token: string, requiredScopes: string[]): void {
  const rec = store.get(token);
  if (!rec) throw new Error('{E_EXPIRED}');
  if (Date.now() > rec.exp) {
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
  ttlMs = 60 * 60 * 1000,
): SessionToken {
  const rec = store.get(token);
  if (!rec) throw new Error('{E_EXPIRED}');
  if (Date.now() > rec.exp) {
    store.delete(token);
    throw new Error('{E_EXPIRED}');
  }
  const next = requestScopes(rec.scopes, signer, ttlMs);
  store.delete(token);
  void removeSession(token);
  sessionEvents.emit('token.rotated', { old: token, token: next.token });
  return next;
}

export async function requestTokenWithConsent(
  scopes: string[],
  signer: (message: string) => string,
  ttlMs = 60 * 60 * 1000,
): Promise<SessionToken> {
  const ok = await requestConsent(scopes);
  if (!ok) throw new Error('{E_DENIED}');
  return requestScopes(scopes, signer, ttlMs);
}

