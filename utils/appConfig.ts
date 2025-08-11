// Configuration values are loaded exclusively from environment variables.
// `EXPO_PUBLIC_WAKU_SECRET` is used to encrypt/decrypt messages sent over
// Waku. **All production peers must use the same secret** or messages will
// not be readable between them.

const ENV_KEYS = [
  'EXPO_PUBLIC_JWT_SECRET',
  'EXPO_PUBLIC_CHAT_SECRET',
  'EXPO_PUBLIC_WAKU_SECRET',
  'EXPO_PUBLIC_WAKU_BOOTSTRAP',
  'EXPO_PUBLIC_ADMIN_USERNAME',
  'EXPO_PUBLIC_PINATA_JWT',
  'EXPO_PUBLIC_PINATA_API_KEY',
  'EXPO_PUBLIC_PINATA_SECRET_API_KEY',
  'EXPO_PUBLIC_TENANT',
  'EXPO_PUBLIC_DEBUG_LOGS',
  'MOONPAY_KEY',
  'APP_NAME',
  'PRIMARY_COLOR',
  'APP_LOGO',
  'TON_NOTIFICATIONS_ADDRESS',
  'TON_STORES_ADDRESS',
  'TON_ORDERS_ADDRESS',
  'TON_SETTINGS_ADDRESS',
  'TON_CART_ADDRESS',
  'TON_USERS_ADDRESS',
  'TON_PRODUCTS_ADDRESS',
  'TON_CATEGORIES_ADDRESS',
];

function loadConfig(): Record<string, string> {
  const cfg: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) {
      cfg[key] = value;
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

export default config;
