import Database from 'better-sqlite3';
import { DatabaseAdapter } from 'electric-sql/node';
import { SqliteBundleMigrator } from 'electric-sql/migrators';
import fs from 'fs';

function parseSqlFile(file: string): string[] {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const statements: string[] = [];
  let current: string[] = [];
  let inTrigger = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    current.push(line);
    const upper = trimmed.toUpperCase();
    if (!inTrigger && upper.startsWith('CREATE TRIGGER')) {
      inTrigger = true;
    }
    if (inTrigger && upper === 'END;') {
      statements.push(current.join('\n'));
      current = [];
      inTrigger = false;
      continue;
    }
    if (!inTrigger && upper.endsWith(';')) {
      statements.push(current.join('\n'));
      current = [];
    }
  }
  return statements;
}

describe('database initialization', () => {
  it('creates tables using ElectricSQL migrator', async () => {
    const statements = parseSqlFile('sqlite/migrations/001_initial_schema.sql');
    const db = new Database(':memory:');
    const adapter = new DatabaseAdapter(db);
    const migrator = new SqliteBundleMigrator(adapter, [
      { version: '1', statements },
    ]);
    await migrator.up();
    const rows = await adapter.query({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
    });
    expect(rows.length).toBe(1);
  });
});
