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

export function isRouterEnabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_USE_ROUTER ??
    process.env.USE_ROUTER ??
    '1'
  ) === '1';
}

export function isWalletEnabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_FEATURE_WALLET === '1' ||
    process.env.FEATURE_WALLET === '1'
  );
}

export function getChain(): string {
  return (
    process.env.EXPO_PUBLIC_CHAIN ||
    process.env.CHAIN ||
    'near'
  );
}

export function getTransport(): string {
  return (
    process.env.EXPO_PUBLIC_TRANSPORT ||
    process.env.TRANSPORT ||
    'http'
  );
}

export function getNearWalletUrl(): string {
  const override =
    process.env.EXPO_PUBLIC_NEAR_WALLET_URL ||
    process.env.NEAR_WALLET_URL;
  if (override) {
    const net = getNetworkId();
    if (override.includes('testnet') !== (net === 'testnet')) {
      console.error(`NEAR_WALLET_URL (${override}) does not match network ${net}`);
    }
    return override;
  }
  const net = getNetworkId();
  return net === 'mainnet'
    ? 'https://app.mynearwallet.com'
    : 'https://testnet.mynearwallet.com';
}

export function getNearHelperUrl(): string {
  const override =
    process.env.EXPO_PUBLIC_NEAR_HELPER_URL ||
    process.env.NEAR_HELPER_URL;
  if (override) {
    const net = getNetworkId();
    if (override.includes('testnet') !== (net === 'testnet')) {
      console.error(`NEAR_HELPER_URL (${override}) does not match network ${net}`);
    }
    return override;
  }
  const net = getNetworkId();
  return net === 'mainnet'
    ? 'https://helper.mainnet.near.org'
    : 'https://helper.testnet.near.org';
}

export function isUiV2Enabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_FEATURE_UI_V2 === '1' ||
    process.env.FEATURE_UI_V2 === '1'
  );
}

export function isDataV2Enabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_FEATURE_DATA_V2 === '1' ||
    process.env.FEATURE_DATA_V2 === '1'
  );
}

export function getAdminWalletAddress(): string {
  return (
    process.env.EXPO_PUBLIC_ADMIN_WALLET_ADDRESS ||
    process.env.ADMIN_WALLET_ADDRESS ||
    ''
  );
}

export function getAdminWalletAddressMainnet(): string {
  return (
    process.env.EXPO_PUBLIC_ADMIN_WALLET_ADDRESS_MAINNET ||
    process.env.ADMIN_WALLET_ADDRESS_MAINNET ||
    getAdminWalletAddress()
  );
}

export function getAdminWalletAddressTestnet(): string {
  return (
    process.env.EXPO_PUBLIC_ADMIN_WALLET_ADDRESS_TESTNET ||
    process.env.ADMIN_WALLET_ADDRESS_TESTNET ||
    getAdminWalletAddress()
  );
}

export default requireEnv;
