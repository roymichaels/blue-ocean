import config, { reloadConfig } from '@/config';

export { reloadConfig };

export function requireEnv(key: keyof typeof config): string {
  const value = config[key];
  if (!value) {
    throw new Error('Missing required environment variable: ' + String(key));
  }
  return value;
}

export function getNearRpcUrls(): string[] {
  console.warn('NotImplemented: getNearRpcUrls (NEAR removed; pending Supabase refactor)');
  return [];
}

export default config;
