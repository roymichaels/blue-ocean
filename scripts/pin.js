#!/usr/bin/env node

/**
 * Redundant IPFS pinning utility. Pins provided files to all configured
 * gateways so content remains available even if one service goes down.
 */

const fs = require('fs');
const FormData = require('form-data');

const gateways = [];

if (process.env.EXPO_PUBLIC_PINATA_JWT || process.env.PINATA_JWT) {
  gateways.push({
    name: 'pinata',
    url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_PINATA_JWT || process.env.PINATA_JWT}`,
    },
  });
}

if (process.env.WEB3_STORAGE_TOKEN) {
  gateways.push({
    name: 'web3.storage',
    url: 'https://api.web3.storage/upload',
    headers: {
      Authorization: `Bearer ${process.env.WEB3_STORAGE_TOKEN}`,
    },
  });
}

if (gateways.length === 0) {
  console.error('No IPFS gateway tokens configured');
  process.exit(1);
}

async function pinToGateway(gateway, filePath) {
  const data = new FormData();
  data.append('file', fs.createReadStream(filePath));
  const res = await fetch(gateway.url, {
    method: 'POST',
    body: data,
    headers: { ...gateway.headers, ...data.getHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to pin via ${gateway.name}: ${res.status}`);
  }
  const json = await res.json();
  return json.IpfsHash || json.cid || json.Hash;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node scripts/pin.js <file> [file...]');
    process.exit(1);
  }
  for (const file of files) {
    const results = await Promise.all(
      gateways.map(async (g) => ({ gateway: g.name, cid: await pinToGateway(g, file) }))
    );
    console.log(`${file}: ${results.map((r) => `${r.gateway}:${r.cid}`).join(' | ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
