import { executeSql } from '../lib/sqlite';

export async function insertConfig(values: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    await executeSql('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
      key,
      value,
    ]);
  }
}

export async function resetConfig(values: Record<string, string> = {}): Promise<void> {
  await executeSql('DELETE FROM config');
  await insertConfig(values);
}
