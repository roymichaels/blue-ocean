import * as SQLite from 'expo-sqlite';

let db: SQLite.Database | null = null;

export function getDatabase(): SQLite.Database {
  if (!db) {
    db = SQLite.openDatabase('app.db');
  }
  return db;
}

export async function executeSql(
  sql: string,
  params: any[] = [],
): Promise<SQLite.SQLResultSet> {
  const database = getDatabase();
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

