import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { parseSql } from './sqlUtils';

const DB_NAME = 'app.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let ensurePromise: Promise<void> | null = null;
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
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
    const rows = await result.getAllAsync();
    return { rows: { _array: rows } };
  } finally {
    await statement.finalizeAsync();
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
    } finally {
      ensurePromise = null;
    }
  })();
  return ensurePromise;
}
