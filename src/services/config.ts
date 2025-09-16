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

export interface NearConfig {
  networkId: string;
  contractId: string;
  walletUrl: string;
  rpcUrl: string;
  helperUrl: string;
  redirectUrl: string;
}

export function nearConfig(): NearConfig {
  const networkId = getNetworkId() || 'testnet';

  const contractId = getContractId() || '';

  const walletUrl =
    process.env.EXPO_PUBLIC_NEAR_WALLET_URL ||
    process.env.NEAR_WALLET_URL ||
    (networkId === 'mainnet'
      ? 'https://app.mynearwallet.com'
      : 'https://testnet.mynearwallet.com');

  const rpcUrl =
    process.env.EXPO_PUBLIC_NEAR_RPC_URL ||
    process.env.NEAR_RPC_URL ||
    (networkId === 'mainnet'
      ? 'https://rpc.mainnet.near.org'
      : 'https://rpc.testnet.near.org');

  const helperUrl =
    process.env.EXPO_PUBLIC_NEAR_HELPER_URL ||
    process.env.NEAR_HELPER_URL ||
    (networkId === 'mainnet'
      ? 'https://helper.mainnet.near.org'
      : 'https://helper.testnet.near.org');

  const redirectUrl =
    process.env.EXPO_PUBLIC_NEAR_WALLET_REDIRECT_URL ||
    process.env.NEAR_WALLET_REDIRECT_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  return {
    networkId,
    contractId,
    walletUrl,
    rpcUrl,
    helperUrl,
    redirectUrl,
  };
}

export const getShopTenantId = () =>
  process.env.EXPO_PUBLIC_SHOP_TENANT_ID ||
  process.env.SHOP_TENANT_ID ||
  '';

export const getContractId = () =>
  process.env.EXPO_PUBLIC_CONTRACT_ID ||
  process.env.CONTRACT_ID ||
  '';

function inferFrom(contractId?: string): string | undefined {
  if (!contractId) return undefined;
  return contractId.endsWith('.testnet') ? 'testnet' : 'mainnet';
}

export const getNetworkId = () =>
  process.env.NEAR_NETWORK_ID ||
  process.env.EXPO_PUBLIC_NETWORK ||
  inferFrom(getContractId());

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

export function getDocsUrl(): string {
  return (
    process.env.EXPO_PUBLIC_DOCS_URL ||
    process.env.DOCS_URL ||
    ''
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

export interface AdminBootstrapFlagConfig {
  enabled: boolean;
  canary: string[];
  rollback: boolean;
}

function parseAddressList(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function toBoolean(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

export function getAdminBootstrapFlag(): AdminBootstrapFlagConfig {
  const rawFlag =
    process.env.EXPO_PUBLIC_FEATURE_ADMIN_BOOTSTRAP_V2 ??
    process.env.FEATURE_ADMIN_BOOTSTRAP_V2 ??
    '';
  const canaryRaw =
    process.env.EXPO_PUBLIC_FEATURE_ADMIN_BOOTSTRAP_V2_CANARY ??
    process.env.FEATURE_ADMIN_BOOTSTRAP_V2_CANARY ??
    '';
  const rollbackRaw =
    process.env.EXPO_PUBLIC_FEATURE_ADMIN_BOOTSTRAP_V2_ROLLBACK ??
    process.env.FEATURE_ADMIN_BOOTSTRAP_V2_ROLLBACK ??
    '';

  const canary = parseAddressList(canaryRaw);
  const rollback = toBoolean(rollbackRaw);

  if (rollback) {
    return { enabled: false, canary: [], rollback: true };
  }

  const normalized = rawFlag.trim().toLowerCase();

  if (normalized === '0' || normalized === 'off' || normalized === 'false') {
    return { enabled: false, canary, rollback: false };
  }

  if (normalized === 'canary') {
    return { enabled: false, canary, rollback: false };
  }

  if (normalized === '1' || normalized === 'on' || normalized === 'true') {
    return { enabled: true, canary, rollback: false };
  }

  // Default behaviour keeps the v2 bootstrap enabled unless explicitly disabled.
  return { enabled: true, canary, rollback: false };
}

export default requireEnv;

// Acceptance: No ‘Missing SHOP_TENANT_ID / CONTRACT_ID’ logs after clean restart.
