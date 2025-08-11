// Deploy a compiled contract to the TON blockchain using ton-core utilities.
import {
  TonClient,
  WalletContractV4,
  internal,
  contractAddress,
  Cell,
} from 'ton-core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
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
  const codeBoc = readFileSync(path.join(buildDir, `${name}.code.boc`));
  const dataBoc = readFileSync(path.join(buildDir, `${name}.data.boc`));
  const code = Cell.fromBoc(codeBoc)[0];
  const data = Cell.fromBoc(dataBoc)[0];

  const address = contractAddress(0, { code, data });
  console.log(`${name} address: ${address.toString()}`);

  const seqno = await openedWallet.getSeqno();

  await openedWallet.sendTransfer({
    seqno,
    secretKey,
    messages: [
      internal({
        to: address,
        value: '0.05',
        init: { code, data },
      }),
    ],
  });

  const addressesPath = path.resolve(
    __dirname,
    '../constants/tonAddresses.json',
  );
  let store: Record<string, string> = {};
  if (existsSync(addressesPath)) {
    store = JSON.parse(readFileSync(addressesPath, 'utf8'));
  }
  store[name] = address.toString();
  writeFileSync(addressesPath, JSON.stringify(store, null, 2));
  console.log(`Deployment transaction sent for ${name}`);
  console.log(`Saved to ${addressesPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
