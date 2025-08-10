import { loadConfig as loadConfigFromStorage, saveConfig as persistConfig } from './configStorage';

// Configuration values are stored locally but can be overridden by
// environment variables. When a value exists in `process.env` it
// takes precedence over the persisted config.
//
// `EXPO_PUBLIC_WAKU_SECRET` is used to encrypt/decrypt messages sent over
// Waku. **All production peers must use the same secret** or messages will
// not be readable between them. During development a random secret is
// generated if one is not provided.

const config: Record<string, string> = {};

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
];

export async function initConfig(): Promise<void> {
  const stored = await loadConfigFromStorage();
  Object.assign(config, stored);
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) {
      config[key] = value;
    }
  }

  if (!config.EXPO_PUBLIC_WAKU_SECRET) {
    if (process.env.NODE_ENV !== 'production') {
      const buf = new Uint8Array(32);
      const cryptoObj =
        typeof globalThis.crypto !== 'undefined'
          ? globalThis.crypto
          : (await import('crypto')).webcrypto;
      cryptoObj.getRandomValues(buf);
      config.EXPO_PUBLIC_WAKU_SECRET = Buffer.from(buf).toString('hex');
      await persistConfig(config);
    } else {
      let secret: string | null = null;
      if (typeof (globalThis as any).prompt === 'function') {
        secret = (globalThis as any).prompt(
          'Enter shared Waku secret used for message decryption:',
        );
      }
      if (secret) {
        config.EXPO_PUBLIC_WAKU_SECRET = secret;
        await persistConfig(config);
      } else {
        const message =
          'Missing EXPO_PUBLIC_WAKU_SECRET. Provide it via configuration or onboarding.';
        console.error(message);
        throw new Error(message);
      }
    }
  }
}

export async function persist(): Promise<void> {
  await persistConfig(config);
}

export function setConfig(key: string, value: string): void {
  config[key] = value;
  // persistence handled externally
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
