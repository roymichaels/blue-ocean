#!/usr/bin/env node

// Backup blue-ocean.db using BackupService and upload to Pinata

// Register ts-node so we can import TypeScript services
try {
  require('ts-node/register');
} catch (err) {
  console.error('ts-node is required to run this script');
  process.exit(1);
}

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const axios = require('axios');

// Polyfill a minimal subset of expo-file-system for BackupService
const FileSystem = {
  documentDirectory: path.join(__dirname, '..') + path.sep,
  cacheDirectory: os.tmpdir() + path.sep,
  EncodingType: { Base64: 'base64' },
  async readAsStringAsync(file, options) {
    return fs.readFile(file, options?.encoding || 'utf8');
  },
  async writeAsStringAsync(file, data, options) {
    await fs.writeFile(file, data, { encoding: options?.encoding });
  },
  async deleteAsync(file, opts = {}) {
    try {
      await fs.unlink(file);
    } catch (err) {
      if (!opts.idempotent) throw err;
    }
  },
  async downloadAsync(url, file) {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    await fs.writeFile(file, res.data);
    return { uri: file };
  },
};

require.cache[require.resolve('expo-file-system')] = { exports: FileSystem };

if (!global.crypto) {
  global.crypto = require('crypto').webcrypto;
}

const { default: BackupService } = require('../services/backup');

const DB_NAME = 'blue-ocean.db';
const DB_SOURCE = path.join(__dirname, '..', DB_NAME);

async function main() {
  const passphrase = process.argv[2];
  if (!passphrase) {
    console.error('Usage: node scripts/backup-db.js <passphrase>');
    process.exit(1);
  }

  const sqliteDir = path.join(FileSystem.documentDirectory, 'SQLite');
  await fs.mkdir(sqliteDir, { recursive: true });
  const target = path.join(sqliteDir, 'app.db');

  await fs.copyFile(DB_SOURCE, target);

  const service = BackupService.getInstance();
  const url = await service.backupDatabase(passphrase);
  console.log('Backup uploaded to:', url);

  await FileSystem.deleteAsync(target, { idempotent: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

