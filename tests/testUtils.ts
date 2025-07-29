import config, { setConfig } from '../utils/appConfig';

export async function insertConfig(values: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    setConfig(key, value);
  }
}

export async function resetConfig(values: Record<string, string> = {}): Promise<void> {
  for (const key of Object.keys(config)) {
    delete (config as any)[key];
  }
  await insertConfig(values);
}
