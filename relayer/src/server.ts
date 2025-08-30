import express from 'express';
import { z } from 'zod';
import { connect, keyStores, utils } from 'near-api-js';
import dotenv from 'dotenv';

dotenv.config();

// Env
const {
  NEAR_RPC_URL = 'https://rpc.testnet.near.org',
  CONTRACT_ID,
  RELAYER_ACCOUNT_ID,
  RELAYER_PRIVATE_KEY,
  PORT = '8787',
  MAX_GAS = '150000000000000',
  MAX_DEPOSIT_YOCTO = '5000000000000000000000000',
  RATE_LIMIT_RPS = '10',
} = process.env as Record<string, string>;

if (!CONTRACT_ID) throw new Error('CONTRACT_ID required');
if (!RELAYER_ACCOUNT_ID) throw new Error('RELAYER_ACCOUNT_ID required');
if (!RELAYER_PRIVATE_KEY) throw new Error('RELAYER_PRIVATE_KEY required');

const rateLimitRps = Math.max(1, parseInt(RATE_LIMIT_RPS || '10', 10));

// Zod schema
const Body = z.object({
  action: z.enum(['add_listing', 'buy_listing']),
  args: z.record(z.any()),
});

// Minimal in-memory rate limiter
let tokens = rateLimitRps;
setInterval(() => {
  tokens = rateLimitRps;
}, 1000);

function takeToken() {
  if (tokens <= 0) return false;
  tokens -= 1;
  return true;
}

// Express app
const app = express();
app.use(express.json());

// Healthz & metrics
const metrics = { total: 0, ok: 0, fail: 0, startedAt: Date.now() };
app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    uptime: Date.now() - metrics.startedAt,
    total: metrics.total,
    okCount: metrics.ok,
    failCount: metrics.fail,
    contractId: CONTRACT_ID,
  });
});

async function callFunction(methodName: string, args: Record<string, unknown>) {
  const ks = new keyStores.InMemoryKeyStore();
  await ks.setKey('testnet', RELAYER_ACCOUNT_ID!, utils.KeyPair.fromString(RELAYER_PRIVATE_KEY!));
  const near = await connect({ networkId: 'testnet', nodeUrl: NEAR_RPC_URL, keyStore: ks as any });
  const account = await near.account(RELAYER_ACCOUNT_ID!);
  const gas = MAX_GAS;
  const deposit = methodName === 'buy_listing' ? String((args as any).amountYocto || '0') : '0';
  const result = await account.functionCall({
    contractId: CONTRACT_ID!,
    methodName,
    args,
    gas,
    attachedDeposit: deposit,
  });
  return result.transaction.hash;
}

function requireStoreId(args: any) {
  const sid = args.store_id ?? args.storeId;
  if (!sid || typeof sid !== 'string') throw new Error('storeId/store_id is required');
}

function assertDepositCaps(action: string, args: any) {
  if (action === 'buy_listing') {
    if (!('amountYocto' in args)) throw new Error('amountYocto required');
    const amount = BigInt(String(args.amountYocto));
    const max = BigInt(String(MAX_DEPOSIT_YOCTO));
    if (amount <= 0n) throw new Error('amountYocto must be > 0');
    if (amount > max) throw new Error('amountYocto exceeds MAX_DEPOSIT_YOCTO');
  }
}

app.post('/meta-tx', async (req, res) => {
  if (!takeToken()) return res.status(429).json({ error: 'rate limit' });
  metrics.total++;
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { action, args } = parsed.data as any;
  try {
    // Guardrails
    requireStoreId(args);
    assertDepositCaps(action, args);
    // Allowlist enforced by zod enum
    const tx = await callFunction(action, args);
    metrics.ok++;
    res.json({ tx });
  } catch (e: any) {
    metrics.fail++;
    res.status(400).json({ error: e.message || 'relayer error' });
  }
});

app.listen(Number(PORT), () => {
  console.log(`Relayer up on :${PORT}`);
});
