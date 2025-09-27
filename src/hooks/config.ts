const STUB_MESSAGE = 'NEAR removed; pending Supabase refactor';
const warn = (name: string) => {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('NotImplemented: ' + name + ' (' + STUB_MESSAGE + ')');
  }
};

export function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error('Missing environment variable: ' + key);
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
  warn('nearConfig');
  return {
    networkId: 'bolt',
    contractId: '',
    walletUrl: '',
    rpcUrl: '',
    helperUrl: '',
    redirectUrl: '',
  };
}

export const getShopTenantId = () => process.env.EXPO_PUBLIC_SHOP_TENANT_ID || process.env.SHOP_TENANT_ID || '';

export const getContractId = () => '';

export const getNetworkId = () => 'bolt';

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
  warn('getChain');
  return 'bolt';
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
  warn('getNearWalletUrl');
  return '';
}

export function getNearHelperUrl(): string {
  warn('getNearHelperUrl');
  return '';
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
  warn('getAdminBootstrapFlag');
  const canary = parseAddressList(undefined);
  const rollback = false;
  return { enabled: false, canary, rollback };
}

export default requireEnv;
