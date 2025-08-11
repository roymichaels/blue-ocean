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
import readline from 'readline';

// Reusable readline interface so stdin can be piped or provided interactively.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const PUBLIC_RPC_ENDPOINTS = [
  'https://testnet.toncenter.com/api/v2/jsonRPC',
  'https://toncenter.com/api/v2/jsonRPC',
  'https://ton.org/api/v2/jsonRPC',
];

function ask(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, (ans) => resolve(ans.trim())));
}

async function main() {
  const args = process.argv.slice(2);
  const name = args.find((a) => !a.startsWith('--'));
  if (!name) {
    console.error(
      'Usage: yarn deploy:ton <contract-name> [--mnemonic <mnemonic>] [--api-key <key>] [--endpoint <url>]'
    );
    process.exit(1);
  }

  let mnemonic: string | undefined;
  let apiKey: string | undefined;
  let endpointOverride: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mnemonic') {
      mnemonic = args[++i];
    } else if (arg === '--api-key') {
      apiKey = args[++i];
    } else if (arg === '--endpoint') {
      endpointOverride = args[++i];
    }
  }

  if (!mnemonic) {
    mnemonic = await ask('Enter wallet mnemonic: ');
  }
  if (!mnemonic) throw new Error('Mnemonic is required');

  if (apiKey === undefined) {
    apiKey = await ask('Enter API key (leave blank if none): ');
  }

  const { secretKey, publicKey } = await mnemonicToPrivateKey(mnemonic.split(' '));

  const endpoints = endpointOverride
    ? [endpointOverride]
    : [...PUBLIC_RPC_ENDPOINTS];
  let client: TonClient | undefined;
  let openedWallet: ReturnType<TonClient['open']> | undefined;
  for (const endpoint of endpoints) {
    try {
      const testClient = new TonClient({ endpoint, apiKey });
      const wallet = WalletContractV4.create({ publicKey, workchain: 0 });
      const testOpened = testClient.open(wallet);
      await testOpened.getSeqno();
      client = testClient;
      openedWallet = testOpened;
      console.log(`Using RPC endpoint: ${endpoint}`);
      break;
    } catch (err) {
      console.warn(`Endpoint ${endpoint} failed: ${(err as Error).message}`);
    }
  }

  if (!client || !openedWallet) {
    throw new Error('All RPC endpoints failed');
  }

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

main()
  .then(() => rl.close())
  .catch((err) => {
    console.error(err);
    rl.close();
    process.exit(1);
  });
