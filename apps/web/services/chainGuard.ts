// Enforce chain guardrails at app startup.
// - CHAIN must be 'near'


import { getChain, isWalletEnabled } from '@/services/config';

const chain = getChain();
if (chain !== 'near') {
  throw new Error('CHAIN guard: EXPO_PUBLIC_CHAIN must be "near". Other chains are not supported.');
}

export const WALLET_ENABLED = isWalletEnabled();

export function assertStoreId(storeId?: string | null) {
  if (!storeId) throw new Error('storeId is required');
}

export default { WALLET_ENABLED, assertStoreId };

