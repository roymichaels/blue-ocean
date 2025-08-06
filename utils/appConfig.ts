import { loadConfig as loadConfigFromStorage, saveConfig as persistConfig } from './configStorage';

// Configuration values are stored locally but can be overridden by
// environment variables. When a value exists in `process.env` it
// takes precedence over the persisted config.

const config: Record<string, string> = {};

// Track whether a missing Waku secret has already been reported
let warnedMissingWakuSecret = false;

const ENV_KEYS = [
  'EXPO_PUBLIC_JWT_SECRET',
  'EXPO_PUBLIC_CHAT_SECRET',
  'EXPO_PUBLIC_WAKU_SECRET',
  'EXPO_PUBLIC_USE_WAKU',
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

  // If no Waku secret was provided disable peer-to-peer sync and warn
  if (!config.EXPO_PUBLIC_WAKU_SECRET) {
    config.EXPO_PUBLIC_USE_WAKU = 'false';
    if (!warnedMissingWakuSecret) {
      console.warn('EXPO_PUBLIC_WAKU_SECRET missing; Waku disabled');
      warnedMissingWakuSecret = true;
    }
  } else if (!config.EXPO_PUBLIC_USE_WAKU) {
    // Enable Waku by default when a secret exists
    config.EXPO_PUBLIC_USE_WAKU = 'true';
  }
}

export async function persist(): Promise<void> {
  await persistConfig(config);
}

export function setConfig(key: string, value: string): void {
  config[key] = value;
  // persistence handled externally
}

export default config;
