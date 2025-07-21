import * as SQLite from 'expo-sqlite/next';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase | null = null;
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    if (Platform.OS === 'web') {
      await SQLite.loadWebSQLiteAsync();
    }
    db = await SQLite.openDatabaseAsync('app.db');
  }
  return db;
}

export async function executeSql(
  sql: string,
  params: any[] = [],
): Promise<SQLite.SQLResultSet> {
  const database = await getDatabase();
  return new Promise((resolve, reject) => {
    database.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_tx, result) => resolve(result),
        (_tx, error) => {
          reject(error);
          return false;
        },
      );
    });
  });
}

