import { store } from '../lib/memoryStore';

export async function saveConfigValue(key: string, value: string): Promise<void> {
  store.config.set(key, value);
}

export async function getConfig(key: string): Promise<string | null> {
  return store.config.get(key) ?? null;
}

export async function checkOnboarding(): Promise<boolean> {
  try {
    const value = await getConfig('ONBOARD_COMPLETE');
    return value === 'true';
  } catch (e) {
    console.error('Failed checking onboarding status:', e);
    return false;
  }
}
