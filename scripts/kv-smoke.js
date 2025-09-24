#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const required = ['NEAR_LAKE_BUCKET', 'NEAR_ACCESS_KEY', 'NEAR_SECRET_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

function run(code) {
  const res = spawnSync('node', ['-r', 'ts-node/register', '-e', code], {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    encoding: 'utf-8',
  });
  if (res.status !== 0) {
    throw new Error(res.stderr);
  }
  return res.stdout.trim();
}

run("const kv=require('./src/services/nearKvStore'); (async()=>{await kv.setValue('smoke','ping','pong');})();");
const out = run("const kv=require('./src/services/nearKvStore'); (async()=>{const v=await kv.getValue('smoke','ping'); console.log(v ?? '')})();");

if (out !== 'pong') {
  console.error('Persistence check failed');
  process.exit(1);
}
console.log('S3 persistence check passed');
