// Enforce chain guardrails at app startup.
// - CHAIN must be 'near'
// - Non-NEAR chains should fail fast

const chain = process.env.EXPO_PUBLIC_CHAIN;
if (chain !== 'near') {
  throw new Error('CHAIN guard: EXPO_PUBLIC_CHAIN must be "near". Other chains are not supported.');
}

export const WALLET_ENABLED = process.env.EXPO_PUBLIC_FEATURE_WALLET === '1';

export function assertStoreId(storeId?: string | null) {
  if (!storeId) throw new Error('storeId is required');
}

export default { WALLET_ENABLED, assertStoreId };

