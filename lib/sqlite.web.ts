import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { parseSql } from './sqlUtils';
import { ensureConfigTable } from './sqlite/initConfigTable';
import { ensureSettingsTable } from './sqlite/initSettingsTable';

const DB_NAME = `${process.env.EXPO_PUBLIC_TENANT || 'app'}.db`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let closeListenerAdded = false;
let ensurePromise: Promise<void> | null = null;
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    // ensure any previous connection is closed before opening a new one
    try {
      await closeDatabase();
    } catch (e) {
      console.warn('Failed to close existing database handle:', e);
    }
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      if (!closeListenerAdded && typeof window !== 'undefined') {
        const handler = () => {
          closeDatabase().catch((e) =>
            console.warn('Failed to close database on unload:', e)
          );
        };
        window.addEventListener('beforeunload', handler);
        closeListenerAdded = true;
      }
      return db;
    })();
  }
  return dbPromise;
}

export async function executeSql(
  sql: string,
  params: any[] = []
): Promise<{ rows: { _array: any[] } }> {
  const database = await getDatabase();
  const statement = await database.prepareAsync(sql);
  try {
    const result = await statement.executeAsync(params);
    let rows: any[] = [];
    try {
      rows = await result.getAllAsync();
    } catch {
      // ignore errors when no rows are returned (e.g., INSERT/UPDATE)
    }
    return { rows: { _array: rows } };
  } finally {
    try {
      await statement.finalizeAsync();
    } catch (e) {
      console.error('Failed to finalize statement:', e);
    }
  }
}

async function tableExists(db: SQLite.SQLiteDatabase, name: string) {
  const stmt = await db.prepareAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  );
  try {
    const res = await stmt.executeAsync([name]);
    const rows = await res.getAllAsync();
    return rows.length > 0;
  } finally {
    await stmt.finalizeAsync();
  }
}


async function applySchema(db: SQLite.SQLiteDatabase) {
  const asset = Asset.fromModule(
    require('../sqlite/migrations/001_initial_schema.sql')
  );
  await asset.downloadAsync();
  const res = await fetch(asset.uri);
  const sql = await res.text();
  const statements = parseSql(sql);
  for (const stmt of statements) {
    const st = await db.prepareAsync(stmt);
    await st.executeAsync();
    await st.finalizeAsync();
  }
}

export function ensureDatabase(): Promise<void> {
  if (ensurePromise) {
    return ensurePromise;
  }
  ensurePromise = (async () => {
    try {
      const db = await getDatabase();
      if (!(await tableExists(db, 'users'))) {
        await applySchema(db);
      }
      await ensureConfigTable(executeSql);
      await ensureSettingsTable(executeSql);
    } finally {
      ensurePromise = null;
    }
  })();
  return ensurePromise;
}

export async function closeDatabase(): Promise<void> {
  if (!dbPromise) {
    return;
  }
  const db = await dbPromise;
  try {
    await db.closeAsync();
  } catch (e) {
    console.warn('Failed to close database:', e);
  } finally {
    dbPromise = null;
  }
}
