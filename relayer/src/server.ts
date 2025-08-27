import express from 'express';
import { z } from 'zod';
import { connect, keyStores, KeyPair } from 'near-api-js';
import dotenv from 'dotenv';

dotenv.config();

const networkId = process.env.RELAYER_NETWORK_ID || 'testnet';
const nodeUrl = process.env.RELAYER_NODE_URL || `https://rpc.${networkId}.near.org`;
const {
  CONTRACT_ID,
  RELAYER_ACCOUNT_ID,
  RELAYER_PRIVATE_KEY,
  PORT = '3000',
  MAX_GAS = '30000000000000',
} = process.env;

const payloadSchema = z.object({
  action: z.enum(['add_listing', 'buy_listing']),
  args: z.record(z.any()),
});

const app = express();
app.use(express.json());

async function callFunction(methodName: string, args: Record<string, unknown>) {
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(
    networkId,
    RELAYER_ACCOUNT_ID!,
    KeyPair.fromString(RELAYER_PRIVATE_KEY as any)
  );
  const near = await connect({ networkId, nodeUrl, deps: { keyStore } });
  const account = await near.account(RELAYER_ACCOUNT_ID!);
  const deposit = methodName === 'buy_listing' ? (args as any).amountYocto : '0';
  const outcome = await account.callFunctionRaw({
    contractId: CONTRACT_ID!,
    methodName,
    args,
    gas: MAX_GAS,
    deposit,
  });
  return outcome.transaction_outcome.id;
}

app.post('/meta-tx', async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { action, args } = parsed.data;
  if (action === 'buy_listing' && (args as any).amountYocto === undefined) {
    return res.status(400).json({ error: 'amountYocto is required' });
  }
  try {
    const hash = await callFunction(action, args);
    res.json({ transactionHash: hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit transaction' });
  }
});

app.listen(Number(PORT), () => {
  console.log(`Relayer listening on port ${PORT}`);
});
