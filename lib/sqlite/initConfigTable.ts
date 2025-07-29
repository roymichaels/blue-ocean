import type { executeSql } from '../sqlite';

export async function ensureConfigTable(exec: typeof executeSql) {
  await exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}
