// Configuration values are loaded from environment variables.
// Only a minimal set of keys is supported at runtime.

// Only enforce NEAR contracts when running in NEAR mode.
const CHAIN = (process.env.EXPO_PUBLIC_CHAIN || '').toLowerCase();
const NEAR_REQUIRED_ENV_KEYS: string[] = [
  'NEAR_SETTINGS_CONTRACT',
  'NEAR_ORDERS_CONTRACT',
  'NEAR_PRODUCT_INDEX_CONTRACT',
  'NEAR_NOTIFICATIONS_CONTRACT',
  'NEAR_STORES_CONTRACT',
  'NEAR_REPORTS_CONTRACT',
  'NEAR_REVIEWS_CONTRACT',
  'NEAR_CATEGORIES_CONTRACT',
  'NEAR_CART_CONTRACT',
  'NEAR_PRODUCTS_CONTRACT',
  'NEAR_USERS_CONTRACT',
];
const REQUIRED_ENV_KEYS: string[] = CHAIN === 'near' ? NEAR_REQUIRED_ENV_KEYS : [];

const ENV_KEYS = [
  'EXPO_PUBLIC_DEBUG_LOGS',
  'EXPO_PUBLIC_WAKU_BOOTSTRAP',
  'EXPO_PUBLIC_CHAIN',
  'ADMIN_WALLET_ADDRESS_MAINNET',
  'ADMIN_WALLET_ADDRESS_TESTNET',
  'NEAR_NETWORK',
  'NEAR_PAYMENT_FACTORY_CONTRACT',

  ...REQUIRED_ENV_KEYS,
  'NEAR_RPC_URL',
  'NEAR_RPC_FALLBACK_URLS',
  'ENABLE_UNSAFE_NEAR_PRIVATE_KEY',
  'EXPO_PUBLIC_PINATA_API_KEY',
  'EXPO_PUBLIC_PINATA_SECRET_API_KEY',
  'EXPO_PUBLIC_PINATA_JWT',
];

function loadConfig(): Record<string, string> {
  const cfg: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) {
      if (
        key === 'ENABLE_UNSAFE_NEAR_PRIVATE_KEY' &&
        process.env.NODE_ENV === 'production'
      ) {
        continue;
      }
      cfg[key] = value;
    } else if (REQUIRED_ENV_KEYS.includes(key)) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  return cfg;
}

const config: Record<string, string> = loadConfig();

export function reloadConfig(): void {
  const fresh = loadConfig();
  for (const key of Object.keys(config)) {
    delete config[key];
  }
  Object.assign(config, fresh);
}

export function getWakuBootstrapNodes(): string[] {
  const override =
    config.EXPO_PUBLIC_WAKU_BOOTSTRAP ||
    process.env.EXPO_PUBLIC_WAKU_BOOTSTRAP;
  if (override) {
    return override
      .split(',')
      .map((addr) => addr.trim())
      .filter(Boolean);
  }
  try {
    const tenant = require('../constants/tenant');
    const list = tenant.AppConfig?.wakuBootstrap || [];
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch {}
  return [];
}

export function requireEnv(key: string): string {
  const value = config[key] || process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getNearRpcUrls(): string[] {
  let tenantRpc = '';
  let tenantFallbacks: string[] = [];
  try {
    const tenant = require('../constants/tenant');
    tenantRpc = tenant.AppConfig?.rpcUrl || '';
    tenantFallbacks = tenant.AppConfig?.rpcFallbackUrls || [];
  } catch {}
  const envPrimary = config.NEAR_RPC_URL || process.env.NEAR_RPC_URL || '';
  const envFallbackRaw =
    config.NEAR_RPC_FALLBACK_URLS || process.env.NEAR_RPC_FALLBACK_URLS || '';
  const envFallbacks = envFallbackRaw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  let primary = envPrimary || tenantRpc;
  const fallbacks = envFallbacks.length > 0 ? envFallbacks : tenantFallbacks;
  if (!primary) {
    primary = 'https://rpc.testnet.near.org';
    // eslint-disable-next-line no-console
    console.warn(
      'NEAR_RPC_URL not set, defaulting to https://rpc.testnet.near.org',
    );
  }
  return [primary, ...fallbacks];
}

export default config;
