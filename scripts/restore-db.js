#!/usr/bin/env node

// Restore blue-ocean.db from the latest Pinata backup using BackupService

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
const config = require('../utils/appConfig').default;

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

const DB_NAME = (config.EXPO_PUBLIC_TENANT || 'app') + '.db';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs/';

async function getLatestBackupCid() {
  const headers = {};
  const jwt = config.EXPO_PUBLIC_PINATA_JWT || '';
  const apiKey = config.EXPO_PUBLIC_PINATA_API_KEY || '';
  const secret = config.EXPO_PUBLIC_PINATA_SECRET_API_KEY || '';
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  } else {
    headers.pinata_api_key = apiKey;
    headers.pinata_secret_api_key = secret;
  }
  const res = await axios.get('https://api.pinata.cloud/data/pinList', {
    headers,
    params: {
      status: 'pinned',
      'metadata[name]': 'app.db.enc',
      pageLimit: 1,
      sort: 'pin_date',
      direction: -1,
    },
  });
  const row = res.data.rows && res.data.rows[0];
  return row ? row.ipfs_pin_hash : null;
}

async function main() {
  const passphrase = process.argv[2];
  if (!passphrase) {
    console.error('Usage: node scripts/restore-db.js <passphrase>');
    process.exit(1);
  }

  const cid = await getLatestBackupCid();
  if (!cid) {
    console.error('No backup found on Pinata');
    process.exit(1);
  }

  const service = BackupService.getInstance();
  const restoredPath = await service.restoreDatabase(cid, passphrase);
  const target = path.join(__dirname, '..', DB_NAME);
  await fs.copyFile(restoredPath, target);
  console.log('Database restored to', target);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

