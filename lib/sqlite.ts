import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

const DB_NAME = 'app.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      if (Platform.OS === 'web') {
        const { electrify } = await import('electric-sql/browser');
        const { schema } = await import('../sqlite/migrations');
        await electrify(db, schema);
      }
      return db;
    })();
  }
  return dbPromise;
}

export async function executeSql(
  sql: string,
  params: any[] = [],
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
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
  );
  try {
    const res = await stmt.executeAsync([name]);
    const rows = await res.getAllAsync();
    return rows.length > 0;
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function ensureDatabase(): Promise<void> {
  if (Platform.OS !== 'web') {
    const sqliteDir = FileSystem.documentDirectory + 'SQLite';
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    const dbPath = sqliteDir + '/' + DB_NAME;

    let needsSetup = false;
    const info = await FileSystem.getInfoAsync(dbPath);
    if (info.exists) {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        if (!(await tableExists(db, 'users'))) {
          needsSetup = true;
        }
      } catch {
        needsSetup = true;
      }
    } else {
      needsSetup = true;
    }

    if (needsSetup) {
      try {
        const asset = Asset.fromModule(require('../sqlite/blue-ocean.db'));
        await asset.downloadAsync();
        await FileSystem.copyAsync({ from: asset.localUri!, to: dbPath });
      } catch (err) {
        console.error('Failed to copy prepopulated database:', err);
      }
    }
  } else {
    // Opening the database will apply the schema via electrify
    await getDatabase();
  }
}

