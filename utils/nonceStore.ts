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
