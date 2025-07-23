#!/usr/bin/env node
const { ShapeStream, isChangeMessage } = require('@electric-sql/client');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const ELECTRIC_URL = process.env.ELECTRIC_URL || process.env.EXPO_PUBLIC_ELECTRIC_URL || 'http://localhost:5133';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../sqlite/blue-ocean.db');

function openDb(file) {
  return new sqlite3.Database(file);
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

async function upsert(db, table, row) {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(',');
  const updates = keys.map((k) => `${k}=?`).join(',');
  const values = keys.map((k) => row[k]);
  await run(
    db,
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
    [...values, ...values]
  );
}

async function handleMessage(db, table, msg) {
  if (!isChangeMessage(msg)) return;
  const op = msg.headers.operation;
  const row = msg.value;
  if (op === 'delete') {
    await run(db, `DELETE FROM ${table} WHERE id=?`, [row.id]);
  } else {
    await upsert(db, table, row);
  }
}

async function start() {
  const tables = ['users', 'products', 'orders'];
  const db = openDb(DB_PATH);
  tables.forEach((table) => {
    const stream = new ShapeStream({
      url: `${ELECTRIC_URL}/v1/shape`,
      params: { table, replica: 'full' },
      subscribe: true,
      onError: (err) => console.error(`ElectricSQL ${table} error`, err),
    });
    stream.subscribe(async (messages) => {
      for (const m of messages) {
        await handleMessage(db, table, m);
      }
    });
  });
  console.log('ElectricSQL replication started');
}

start().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
