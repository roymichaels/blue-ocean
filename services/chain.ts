// Backwards-compat shim so existing imports keep working.
// The authoritative chain guard lives in config/chain.ts.
import CHAIN from '../config/chain';

export function assertNearChain(): void {
  if (CHAIN !== 'near') {
    throw new Error('BlueOcean is NEAR-only. Set EXPO_PUBLIC_CHAIN=near');
  }
}

// Legacy name kept for compatibility with existing imports
export function assertTonChain(): void {
  assertNearChain();
}

export default CHAIN;
