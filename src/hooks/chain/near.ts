import { init, signIn, signMessage, useAccount, useAccountId, getAccountId, getPublicKey, getSelector } from '@/services/walletSelector';
import { payPrivately as nearPayPrivately } from '@blue-ocean/sdk-near';
import { listOrdersBySeller as nearListOrdersBySeller, listOrdersByBuyer as nearListOrdersByBuyer } from '@/services/nearOrders';
import { getNetworkId } from '@/hooks/config';
import config from '@/config';
import type { ChainAdapter } from './ChainAdapter';
import { canonicalJson } from '@/utils/serialization';

async function getBalance(address: string): Promise<string> {
  const network = getNetworkId() as 'mainnet' | 'testnet';
  // Prefer relay proxy (avoids CORS + 429 headers missing ACAO)
  const proxy = (config.EXPO_PUBLIC_RELAYER_URL || '').trim();
  const rpcUrl = proxy ? `${proxy.replace(/\/$/, '')}/rpc` : (network === 'mainnet' ? 'https://rpc.mainnet.near.org' : 'https://rpc.testnet.near.org');
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: canonicalJson({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'query',
      params: {
        request_type: 'view_account',
        finality: 'final',
        account_id: address,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch balance: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.result?.amount || '0';
}

export const nearAdapter: ChainAdapter = {
  init,
  openModal: signIn,
  useAccount,
  useAccountId,
  getAccountId,
  getPublicKey,
  getSelector,
  getBalance,
  signMessage,
  listOrdersBySeller: nearListOrdersBySeller,
  listOrdersByBuyer: nearListOrdersByBuyer,
  payPrivately: nearPayPrivately,
};

export default nearAdapter;
