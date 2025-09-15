import { EventEmitter } from 'events';
import { uuid } from '@/utils/uuid';

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
  return record;
}

const store = new Map<string, SessionToken>();

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
  sessionEvents.emit('token.rotated', { old: token, token: next.token });
  return next;
}

