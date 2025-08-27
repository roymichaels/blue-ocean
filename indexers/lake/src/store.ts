import 'dotenv/config';
import Database from 'better-sqlite3';

const dbPath = process.env.DB_PATH || './lake.db';

export const db = new Database(dbPath);

export function init() {
  db.exec(`CREATE TABLE IF NOT EXISTS listings (
    receipt_id TEXT PRIMARY KEY,
    block_height INTEGER,
    data TEXT
  );`);

  db.exec(`CREATE TABLE IF NOT EXISTS orders (
    receipt_id TEXT PRIMARY KEY,
    block_height INTEGER,
    data TEXT
  );`);
}

export function upsertEvent(
  event: string,
  receiptId: string,
  blockHeight: number,
  data: unknown
) {
  let table: 'listings' | 'orders' | undefined;
  if (event === 'listing_added') {
    table = 'listings';
  } else if (event === 'order_paid') {
    table = 'orders';
  }

  if (!table) return;

  const stmt = db.prepare(
    `INSERT INTO ${table} (receipt_id, block_height, data)
     VALUES (?, ?, ?)
     ON CONFLICT(receipt_id) DO UPDATE SET
       block_height = excluded.block_height,
       data = excluded.data`
  );
  stmt.run(receiptId, blockHeight, JSON.stringify(data));
}

