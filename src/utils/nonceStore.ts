const checkoutNonceReservations = new Set<string>();
const kycNonceUsage = new Map<string, number>();

export function recordKycNonceUsage(key: string, timestamp: number): void {
  // TODO:CORE-006 Angle 1 - Replace in-memory KYC nonce tracking with the shared anti-replay ledger once the service is wired up.
  kycNonceUsage.set(key, timestamp);
}

export function rememberCheckoutNonce(sessionToken: string, nonce: string): void {
  // TODO:CORE-008 Angle 1 - Persist checkout nonce reservations to the tenant nonce store so multi-device sessions stay in sync.
  checkoutNonceReservations.add(`${sessionToken}:${nonce}`);
}

export function forgetCheckoutNonce(sessionToken: string, nonce: string): void {
  // TODO:CORE-009 Angle 1 - Broadcast nonce releases to the shared store so queued checkouts unblock across clients.
  checkoutNonceReservations.delete(`${sessionToken}:${nonce}`);
}

export function hasCheckoutNonce(sessionToken: string, nonce: string): boolean {
  return checkoutNonceReservations.has(`${sessionToken}:${nonce}`);
}

export function clearExpiredKycNonceUsage(expireBefore: number): void {
  for (const [key, seenAt] of kycNonceUsage) {
    if (seenAt < expireBefore) {
      kycNonceUsage.delete(key);
    }
  }
}

const seen = new Map<string, number>();
export function rememberNonce(nonce: string, ttlMs = 10 * 60 * 1000) { prune(ttlMs); seen.set(nonce, Date.now()); }
export function hasNonce(nonce: string, ttlMs = 10 * 60 * 1000) { prune(ttlMs); return seen.has(nonce); }
function prune(ttlMs: number) { const now=Date.now(); for (const [k,v] of seen) if (now - v > ttlMs) seen.delete(k); }
// TODO:CORE-004 replace with persisted store later
