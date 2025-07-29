import type { executeSql } from '../sqlite';

export async function ensureSettingsTable(exec: typeof executeSql) {
  await exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'string',
      description TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS waku_seen (
      -- SHA-256 hash of the decrypted message
      id TEXT NOT NULL,
      topic TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(id, topic)
    );
  `);

  await exec(
    `INSERT OR IGNORE INTO settings (key, value, type, description) VALUES
      ('storeName', 'The Congress', 'string', 'Store name'),
      ('color', '#000000', 'string', 'Theme color')
    `
  );
}
