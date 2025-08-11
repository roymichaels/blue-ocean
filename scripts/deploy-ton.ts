// @ts-ignore - runtime provided via jest mocks during tests
import { TonClient, WalletContractV4, internal } from 'ton-core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { readFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export async function deployTonContract(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
  contractsDir = path.resolve(__dirname, '../contracts/ton')
) {
  if (!name) {
    throw new Error('Contract name required');
  }

  const endpoint = env.TON_ENDPOINT || 'https://testnet.toncenter.com/api/v2/jsonRPC';
  const mnemonic = env.TON_MNEMONIC;
  if (!mnemonic) throw new Error('TON_MNEMONIC not set');

  const { secretKey, publicKey } = await mnemonicToPrivateKey(mnemonic.split(' '));

  const client = new TonClient({ endpoint, apiKey: env.TON_API_KEY });
  const wallet = WalletContractV4.create({ publicKey, workchain: 0 });
  const openedWallet = client.open(wallet);

  const buildDir = path.join(contractsDir, 'build');
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
        init: { code: code as any, data: data as any },
      }),
    ],
  });

  console.log(`Deployment transaction sent for ${name}`);
}

if (require.main === module) {
  const [name] = process.argv.slice(2);
  if (!name) {
    console.error('Usage: yarn deploy:ton <contract-name>');
    process.exit(1);
  }
  deployTonContract(name).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
