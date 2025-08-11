import { TonClient, WalletContractV4, internal } from 'ton-core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { readFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const [name] = process.argv.slice(2);
  if (!name) {
    console.error('Usage: yarn deploy:ton <contract-name>');
    process.exit(1);
  }

  const endpoint = process.env.TON_ENDPOINT || 'https://testnet.toncenter.com/api/v2/jsonRPC';
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) throw new Error('TON_MNEMONIC not set');

  const { secretKey, publicKey } = await mnemonicToPrivateKey(mnemonic.split(' '));

  const client = new TonClient({ endpoint, apiKey: process.env.TON_API_KEY });
  const wallet = WalletContractV4.create({ publicKey, workchain: 0 });
  const openedWallet = client.open(wallet);

  const buildDir = path.resolve(__dirname, '../contracts/ton/build');
  const code = readFileSync(path.join(buildDir, `${name}.code.boc`));
  const data = readFileSync(path.join(buildDir, `${name}.data.boc`));

  const seqno = await openedWallet.getSeqno();

  await openedWallet.sendTransfer({
    seqno,
    secretKey,
    messages: [
      internal({
        to: wallet.address,
        value: '0.05',
        init: { code, data },
      }),
    ],
  });

  console.log(`Deployment transaction sent for ${name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
