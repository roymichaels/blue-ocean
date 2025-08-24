// Configuration values are loaded from environment variables.
// Only a minimal set of keys is supported at runtime.

const REQUIRED_ENV_KEYS = ['ORDER_PAYMENT_FACTORY_ADDRESS'];

const ENV_KEYS = [
  'EXPO_PUBLIC_DEBUG_LOGS',
  'EXPO_PUBLIC_WAKU_BOOTSTRAP',
  'ADMIN_WALLET_ADDRESS',
  ...REQUIRED_ENV_KEYS,
  'TON_RPC_URL',
  'TON_RPC_FALLBACK_URLS',
  'ENABLE_UNSAFE_TON_PRIVATE_KEY',
  'PINATA_JWT',
];

function loadConfig(): Record<string, string> {
  const cfg: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) {
      if (
        key === 'ENABLE_UNSAFE_TON_PRIVATE_KEY' &&
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

export function getTonRpcUrls(): string[] {
  let tenantRpc = '';
  let tenantFallbacks: string[] = [];
  try {
    const tenant = require('../constants/tenant');
    tenantRpc = tenant.AppConfig?.rpcUrl || '';
    tenantFallbacks = tenant.AppConfig?.rpcFallbackUrls || [];
  } catch {}
  const envPrimary = config.TON_RPC_URL || process.env.TON_RPC_URL || '';
  const envFallbackRaw =
    config.TON_RPC_FALLBACK_URLS || process.env.TON_RPC_FALLBACK_URLS || '';
  const envFallbacks = envFallbackRaw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const primary = envPrimary || tenantRpc;
  const fallbacks = envFallbacks.length > 0 ? envFallbacks : tenantFallbacks;
  if (!primary) {
    throw new Error('Missing TON RPC URL');
  }
  return [primary, ...fallbacks];
}

export default config;
