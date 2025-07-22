import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('app.db');
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

