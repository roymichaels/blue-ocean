export function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function getShopTenantId(): string {
  return (
    process.env.EXPO_PUBLIC_SHOP_TENANT_ID ||
    process.env.SHOP_TENANT_ID ||
    requireEnv('SHOP_TENANT_ID')
  );
}

export function getContractId(): string {
  return (
    process.env.EXPO_PUBLIC_CONTRACT_ID ||
    process.env.CONTRACT_ID ||
    requireEnv('CONTRACT_ID')
  );
}

export function getNetworkId(): string {
  const explicit =
    process.env.EXPO_PUBLIC_NETWORK ||
    process.env.EXPO_PUBLIC_NETWORK_ID ||
    process.env.EXPO_PUBLIC_NEAR_NETWORK_ID ||
    process.env.NEAR_NETWORK_ID ||
    process.env.NETWORK_ID;
  if (explicit) return explicit;
  const cid = getContractId();
  return cid.endsWith('.testnet') ? 'testnet' : 'mainnet';
}

export default requireEnv;
