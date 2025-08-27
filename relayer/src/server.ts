import express, { Request, Response } from 'express';
import * as nearAPI from 'near-api-js';
import dotenv from 'dotenv';

dotenv.config();

const ALLOWED_METHODS = new Set(['add_listing', 'buy_listing']);

async function initAccount() {
  const networkId = process.env.RELAYER_NETWORK_ID || 'testnet';
  const nodeUrl = process.env.RELAYER_NODE_URL || `https://rpc.${networkId}.near.org`;
  const accountId = process.env.RELAYER_ACCOUNT_ID as string;
  const privateKey = process.env.RELAYER_PRIVATE_KEY as string;
  const keyStore = new nearAPI.keyStores.InMemoryKeyStore();
  const keyPair = nearAPI.KeyPair.fromString(privateKey as any);
  await keyStore.setKey(networkId, accountId, keyPair);
  const near = await nearAPI.connect({ networkId, nodeUrl, deps: { keyStore } });
  return new nearAPI.Account(accountId, near.connection.provider, near.connection.signer);
}

async function main() {
  const app = express();
  app.use(express.json());
  let account: nearAPI.Account | null = null;
  try {
    account = await initAccount();
  } catch (err) {
    console.error('Failed to initialize relayer account', err);
  }

  app.post('/meta-tx', async (req: Request, res: Response) => {
    const { signerId, receiverId, methodName, args, publicKey, signature, gas, deposit } = req.body;

    if (!ALLOWED_METHODS.has(methodName)) {
      return res.status(400).json({ error: 'Method not allowed' });
    }

    try {
      const pk = nearAPI.utils.PublicKey.fromString(publicKey);
      const message = Buffer.from(JSON.stringify({ signerId, receiverId, methodName, args }));
      const sig = Buffer.from(signature, 'base64');
      if (!pk.verify(message, sig)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Signature verification failed' });
    }

    try {
      if (!account) {
        return res.status(500).json({ error: 'Relayer account not configured' });
      }

      const result = await account.functionCall({
        contractId: receiverId,
        methodName,
        args,
        gas: gas || '30000000000000',
        attachedDeposit: deposit || '0'
      });
      return res.json({ transaction: result.transaction.hash });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to submit transaction' });
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Relayer listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
