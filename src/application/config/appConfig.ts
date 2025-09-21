import type { AppMode } from '@/application/types';
import manifest from '../../../app.json';

type ExpoManifest = typeof manifest.expo;

type ExtraConfig = {
  appMode?: AppMode;
  apiBaseUrl?: string;
};

const expoConfig: ExpoManifest | undefined = manifest?.expo;
const extra: ExtraConfig = (expoConfig?.extra ?? {}) as ExtraConfig;

export const appVersion = typeof expoConfig?.version === 'string' ? expoConfig.version : 'dev';
export const appSlug = typeof expoConfig?.slug === 'string' ? expoConfig.slug : 'blue-ocean';

export function resolveInitialAppMode(envValue?: string | null): AppMode {
  if (envValue === 'live' || envValue === 'mock') {
    return envValue;
  }
  return extra.appMode === 'live' ? 'live' : 'mock';
}

export function getApiBaseUrl(envValue?: string | null): string | undefined {
  if (envValue && envValue.length > 0) {
    return envValue;
  }
  return typeof extra.apiBaseUrl === 'string' ? extra.apiBaseUrl : undefined;
}
