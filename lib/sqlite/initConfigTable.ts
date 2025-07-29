import { executeSql } from '../sqlite';

export const ensureConfigTable = async () => {
  await executeSql(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
};
