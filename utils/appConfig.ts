// Configuration values are loaded from environment variables. Contract
// addresses are persisted in `constants/tonAddresses.json` and merged into
// the config at runtime. `EXPO_PUBLIC_WAKU_SECRET` is used to encrypt/decrypt
// messages sent over Waku. **All production peers must use the same secret**
// or messages will not be readable between them.

import tonAddresses from '../constants/tonAddresses.json';

const ENV_KEYS = [
  'EXPO_PUBLIC_JWT_SECRET',
  'EXPO_PUBLIC_CHAT_SECRET',
  'EXPO_PUBLIC_WAKU_SECRET',
  'EXPO_PUBLIC_WAKU_BOOTSTRAP',
  'EXPO_PUBLIC_PINATA_JWT',
  'EXPO_PUBLIC_PINATA_API_KEY',
  'EXPO_PUBLIC_PINATA_SECRET_API_KEY',
  'EXPO_PUBLIC_TENANT',
  'EXPO_PUBLIC_DEBUG_LOGS',
  'MOONPAY_KEY',
  'APP_NAME',
  'PRIMARY_COLOR',
  'APP_LOGO',
];

function loadConfig(): Record<string, string> {
  const cfg: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) {
      cfg[key] = value;
    }
  }
  for (const [name, addr] of Object.entries(tonAddresses)) {
    const key = `TON_${name.toUpperCase()}_ADDRESS`;
    cfg[key] = process.env[key] ?? addr;
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
