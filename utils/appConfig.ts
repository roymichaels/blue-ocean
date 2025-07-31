import { loadConfig as loadConfigFromStorage, saveConfig as persistConfig } from './configStorage';

const config: Record<string, string> = {};

export async function initConfig(): Promise<void> {
  const stored = await loadConfigFromStorage();
  Object.assign(config, stored);
}

export async function persist(): Promise<void> {
  await persistConfig(config);
}

export function setConfig(key: string, value: string): void {
  config[key] = value;
  // persistence handled externally
}

export default config;
