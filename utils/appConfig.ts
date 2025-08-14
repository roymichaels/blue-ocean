// Configuration values are loaded from environment variables.
// Only a minimal set of keys is supported at runtime.

const REQUIRED_ENV_KEYS = [
  'ADMIN_WALLET_ADDRESS',
  'ORDER_PAYMENT_FACTORY_ADDRESS',
  'TON_RPC_URL',
];

const ENV_KEYS = [
  'EXPO_PUBLIC_DEBUG_LOGS',
  'EXPO_PUBLIC_WAKU_BOOTSTRAP',
  'EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY',
  ...REQUIRED_ENV_KEYS,
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
  const raw =
    config.EXPO_PUBLIC_WAKU_BOOTSTRAP ||
    process.env.EXPO_PUBLIC_WAKU_BOOTSTRAP;
  if (!raw) return [];
  return raw
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean);
}

export function requireEnv(key: string): string {
  const value = config[key] || process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getTonRpcUrls(): string[] {
  const primary = requireEnv('TON_RPC_URL');
  const fallbacks = config.TON_RPC_FALLBACK_URLS || process.env.TON_RPC_FALLBACK_URLS || '';
  const extra = fallbacks
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  return [primary, ...extra];
}

export default config;
