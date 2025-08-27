import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';
export const pool = new Pool({ connectionString });

export async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS listing_events (
    receipt_id TEXT PRIMARY KEY,
    block_height BIGINT,
    data JSONB
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS order_events (
    receipt_id TEXT PRIMARY KEY,
    block_height BIGINT,
    data JSONB
  );`);
}

export async function upsertListing(receiptId: string, blockHeight: number, data: unknown) {
  await pool.query(
    `INSERT INTO listing_events (receipt_id, block_height, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (receipt_id) DO UPDATE SET block_height = EXCLUDED.block_height, data = EXCLUDED.data`,
    [receiptId, blockHeight, data]
  );
}

export async function upsertOrder(receiptId: string, blockHeight: number, data: unknown) {
  await pool.query(
    `INSERT INTO order_events (receipt_id, block_height, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (receipt_id) DO UPDATE SET block_height = EXCLUDED.block_height, data = EXCLUDED.data`,
    [receiptId, blockHeight, data]
  );
}
