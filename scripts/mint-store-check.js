#!/usr/bin/env node
const { spawnSync } = require('child_process');

const contract = process.env.EXPO_PUBLIC_CONTRACT_ID;
const caller = process.argv[2] || process.env.NEAR_CALLER_ACCOUNT;
if (!contract || !caller) {
  console.error(
    'Usage: yarn mint:check <accountId> (or set NEAR_CALLER_ACCOUNT)',
  );
  process.exit(1);
}

const storeId = `health-${Date.now()}`;
const args = JSON.stringify({
  store_id: storeId,
  name: 'health',
  owner_id: caller,
  nft_id: ''
});

const res = spawnSync('near', [
  'call',
  contract,
  'mint_store',
  args,
  '--accountId',
  caller,
  '--gas',
  '30000000000000',
  '--deposit',
  '0'
], { stdio: 'inherit' });

if (res.status !== 0) {
  console.error('mint_store call failed');
  process.exit(res.status || 1);
}

console.log('mint_store call succeeded');
