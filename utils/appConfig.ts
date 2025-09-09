import config, { reloadConfig } from '@/config';

export { reloadConfig };

export function getWakuBootstrapNodes(): string[] {
  const override = config.EXPO_PUBLIC_WAKU_BOOTSTRAP;
  if (override) {
    return override
      .split(',')
      .map((addr) => addr.trim())
      .filter(Boolean);
  }
  try {
    const tenant = require('@/constants/tenant');
    const list = tenant.AppConfig?.wakuBootstrap || [];
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch {}
  return [];
}

export function requireEnv(key: keyof typeof config): string {
  const value = config[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getNearRpcUrls(): string[] {
  let tenantRpc = '';
  let tenantFallbacks: string[] = [];
  try {
    const tenant = require('@/constants/tenant');
    tenantRpc = tenant.AppConfig?.rpcUrl || '';
    tenantFallbacks = tenant.AppConfig?.rpcFallbackUrls || [];
  } catch {}
  const envPrimary = config.NEAR_RPC_URL;
  const envFallbackRaw = config.NEAR_RPC_FALLBACK_URLS;
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
