// Backwards-compat shim so existing imports keep working.
// The new authoritative chain guard lives in config/chain.ts.
import CHAIN from '../config/chain';

export function assertTonChain(): void {
  // TON is not supported in the MVP; guard remains a no-op.
  return;
}

export default CHAIN;
