import { store } from '../lib/memoryStore';

export async function insertConfig(values: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    store.config.set(key, value);
  }
}

export async function resetConfig(values: Record<string, string> = {}): Promise<void> {
  store.config.clear();
  await insertConfig(values);
}
