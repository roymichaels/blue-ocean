import { providers } from 'near-api-js';
import { Buffer } from 'buffer';
import { nearConfig } from '@/services/config';
import { getAccountId, getSelector } from './walletSelector';

export interface ChainStore {
  id: string;
  name: string;
  owner_id: string;
  nft_id: string;
  reputation?: number;
}

function getProvider() {
  const { rpcUrl } = nearConfig();
  return new providers.JsonRpcProvider({ url: rpcUrl });
}

function getContractId(): string {
  return nearConfig().contractId;
}

function parseResult(res: any) {
  return JSON.parse(Buffer.from(res.result).toString());
}

export async function getStore(id: string): Promise<ChainStore | null> {
  try {
    const provider = getProvider();
    const res: any = await provider.query({
      request_type: 'call_function',
      account_id: getContractId(),
      method_name: 'get_store',
      args_base64: Buffer.from(JSON.stringify({ id })).toString('base64'),
      finality: 'optimistic',
    });
    const data = parseResult(res);
    if (!data) return null;
    return {
      id: data.id ?? data.store_id ?? '',
      name: data.name ?? '',
      owner_id: data.owner_id ?? data.owner ?? '',
      nft_id: data.nft_id ?? '',
      reputation:
        typeof data.reputation === 'string'
          ? Number(data.reputation)
          : data.reputation,
    };
  } catch (e: any) {
    throw new Error(`get_store failed: ${e.message || e}`);
  }
}

export async function listStores(): Promise<ChainStore[]> {
  try {
    const provider = getProvider();
    const res: any = await provider.query({
      request_type: 'call_function',
      account_id: getContractId(),
      method_name: 'list_stores',
      args_base64: Buffer.from('{}').toString('base64'),
      finality: 'optimistic',
    });
    const data = parseResult(res);
    if (!Array.isArray(data)) return [];
    return data.map((s: any) => ({
      id: s.id ?? s.store_id ?? '',
      name: s.name ?? '',
      owner_id: s.owner_id ?? s.owner ?? '',
      nft_id: s.nft_id ?? '',
      reputation:
        typeof s.reputation === 'string' ? Number(s.reputation) : s.reputation,
    }));
  } catch (e: any) {
    throw new Error(`list_stores failed: ${e.message || e}`);
  }
}

export async function mintStore(store: ChainStore): Promise<string> {
  try {
    const selector = getSelector();
    const accountId = getAccountId();
    if (!selector || !accountId) {
      throw new Error('Wallet not initialized');
    }
    const wallet = await selector.wallet();
    const res: any = await wallet.signAndSendTransaction({
      signerId: accountId,
      receiverId: getContractId(),
      actions: [
        {
          type: 'FunctionCall',
          params: {
            methodName: 'mint_store',
            args: {
              store_id: store.id,
              name: store.name,
              owner_id: store.owner_id,
              nft_id: store.nft_id,
            },
            gas: '30000000000000',
            deposit: '0',
          },
        },
      ],
    });
    return res.transaction?.hash || '';
  } catch (e: any) {
    throw new Error(`mint_store failed: ${e.message || e}`);
  }
}
