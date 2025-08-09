import TonWeb from 'tonweb';
import fs from 'fs/promises';
import path from 'path';
import { Order } from '../types';

interface TonNetworkConfig {
  endpoint: string;
  apiKey?: string;
  workchain: number;
  walletType: 'v3R2' | 'v4R2';
}

/**
 * Global TON network configuration. Defaults target the public
 * toncenter testnet so the service works without additional setup.
 */
export const networkConfig: TonNetworkConfig = {
  endpoint: process.env.TON_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC',
  apiKey: process.env.TON_API_KEY,
  workchain: Number(process.env.TON_WORKCHAIN ?? 0),
  walletType: (process.env.TON_WALLET_TYPE ?? 'v4R2') as TonNetworkConfig['walletType'],
};

const provider = new TonWeb.HttpProvider(networkConfig.endpoint, {
  apiKey: networkConfig.apiKey,
});
const tonweb = new TonWeb(provider);

type KeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };

/**
 * Compiles the `order-payment.tact` contract via the public Tact
 * compiler service and returns its code and data cells.
 */
async function compileOrderContract() {
  try {
    const source = await fs.readFile(
      path.resolve(__dirname, '../contracts/order-payment.tact'),
      'utf8'
    );

    const res = await fetch('https://tact-lang.org/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: { 'order-payment.tact': source } }),
    });

    if (!res.ok) {
      throw new Error(`Tact compiler error: ${res.statusText}`);
    }

    const { contracts }: any = await res.json();
    const c = contracts['OrderPayment'];
    const code = TonWeb.boc.Cell.fromBoc(Buffer.from(c.codeBoc, 'base64'))[0];
    const data = TonWeb.boc.Cell.fromBoc(Buffer.from(c.dataBoc, 'base64'))[0];
    return { code, data, address: c.address };
  } catch (e) {
    console.error('Failed to compile order-payment contract', e);
    throw e;
  }
}

async function sendTransaction(opts: {
  to: string;
  amount: string;
  keys: KeyPair;
  payload?: TonWeb.boc.Cell;
  stateInit?: TonWeb.boc.Cell;
}): Promise<string> {
  const walletClass = (tonweb.wallet as any).all[networkConfig.walletType];
  const wallet = new walletClass(provider, {
    publicKey: opts.keys.publicKey,
    wc: networkConfig.workchain,
  });

  const seqno = await wallet.methods.seqno().call();
  const transfer = wallet.methods.transfer({
    secretKey: opts.keys.secretKey,
    toAddress: opts.to,
    amount: TonWeb.utils.toNano(opts.amount),
    seqno,
    payload: opts.payload,
    stateInit: opts.stateInit,
  });

  const boc = await transfer.getBoc();
  const hash = TonWeb.utils.bytesToHex(TonWeb.utils.sha256_sync(boc));
  await provider.sendBoc(boc);
  return hash;
}

function makeComment(message: string): TonWeb.boc.Cell {
  const cell = new TonWeb.boc.Cell();
  (cell.bits as any).writeUint(0, 32);
  (cell.bits as any).writeBytes(TonWeb.utils.stringToBytes(message));
  return cell;
}

/**
 * Deploys a new order-payment contract on chain and returns the
 * deployed address together with the deployment transaction hash.
 */
export async function initOrderContract(
  keys: KeyPair,
  owner: string,
  seller: string,
  buyer: string,
  amount: bigint
): Promise<{ address: string; txHash: string }> {
  try {
    const { code, data, address } = await compileOrderContract();
    const contract = new (TonWeb as any).Contract(provider, { code, data });
    const init = await contract.createStateInit();
    const txHash = await sendTransaction({
      to: address,
      amount: '0.05',
      stateInit: init.stateInit,
      keys,
    });
    return { address, txHash };
  } catch (e) {
    console.error('Failed to deploy order contract', e);
    throw e;
  }
}

/**
 * Sends the buyer's payment to the contract and returns the
 * resulting transaction hash.
 */
export async function payOrder(
  order: Order,
  contractAddress: string,
  keys: KeyPair
): Promise<string> {
  try {
    const payload = makeComment(`Pay:${order.total}`);
    return await sendTransaction({
      to: contractAddress,
      amount: String(order.total),
      payload,
      keys,
    });
  } catch (e) {
    console.error('Failed to pay order', e);
    throw e;
  }
}

/**
 * Releases escrowed funds to the seller and returns the
 * transaction hash.
 */
export async function releaseFunds(
  contractAddress: string,
  keys: KeyPair
): Promise<string> {
  try {
    const payload = makeComment('Release');
    return await sendTransaction({
      to: contractAddress,
      amount: '0',
      payload,
      keys,
    });
  } catch (e) {
    console.error('Failed to release funds', e);
    throw e;
  }
}

/**
 * Refunds the buyer from the escrow contract and returns the
 * transaction hash.
 */
export async function refundOrder(
  contractAddress: string,
  keys: KeyPair
): Promise<string> {
  try {
    const payload = makeComment('Refund');
    return await sendTransaction({
      to: contractAddress,
      amount: '0',
      payload,
      keys,
    });
  } catch (e) {
    console.error('Failed to refund order', e);
    throw e;
  }
}

