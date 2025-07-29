import { executeSql } from '../lib/sqlite';

export async function saveConfigValue(key: string, value: string): Promise<void> {
  await executeSql('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value]);
}

export async function getConfig(key: string): Promise<string | null> {
  const res = await executeSql('SELECT value FROM config WHERE key=?', [key]);
  return (res.rows as any)._array?.[0]?.value ?? null;
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
