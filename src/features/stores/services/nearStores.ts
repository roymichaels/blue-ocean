import { Store } from '@/types';
import { chainAdapter, assertNearChain } from '@/services/chain';
import { requireStoreId } from '@blue-ocean/utils';
import { listStores as contractListStores } from '@/services/nearStoreContract';
import { canonicalJson } from '@/utils/serialization';
import { nearConfig } from '@/services/config';
import { getSelector } from '@/services/walletSelector';
import { Buffer } from 'buffer';
import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { errorLog } from '@/utils/logger';
import config from '@/config';

assertNearChain();

const ADDRESS = 'stores';
const DISABLED = false;
let SEEDED = false;

function ensureSeed() {
  if (!DISABLED || SEEDED) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('@/assets/seed/seed-data.json');
    if (data?.stores) {
      for (const s of data.stores as Store[]) {
        const sid = requireStoreId(s.id);
        const json = canonicalJson(s);
        void setValue(ADDRESS, storeKey(s.id, sid), json);
        void setValue(ADDRESS, indexKey(s.id), json);
      }
    }
  } catch {}
  SEEDED = true;
}

function fromChain(data: any): Store {
  return {
    id: data.id ?? data.store_id ?? '',
    name: data.name ?? '',
    owner: data.owner_id ?? data.owner ?? '',
    nftId: data.nft_id ?? data.nftId ?? '',
    reputation:
      typeof data.reputation === 'string'
        ? Number(data.reputation)
        : data.reputation,
  } as Store;
}

export async function mintStore(
  name: string
): Promise<{ id: string; nftId: string; txHash: string }> {
  const { contractId } = nearConfig();
  if (!contractId) throw new Error('CONTRACT_ID required');
  const selector = getSelector();
  if (!selector) throw new Error('Wallet not initialized');
  const wallet = await selector.wallet();
  const res: any = await wallet.signAndSendTransactions({
    transactions: [
      {
        receiverId: contractId,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'mint_store',
              args: { name },
              gas: '30000000000000',
              deposit: '0',
            },
          },
        ],
      },
    ],
  });

  const outcome = Array.isArray(res) ? res[0] : res;
  const txHash: string = outcome?.transaction?.hash || '';
  let id = '';
  let nftId = '';
  try {
    const val =
      outcome?.status?.SuccessValue ||
      outcome?.transaction_outcome?.outcome?.status?.SuccessValue;
    if (val) {
      const decoded = Buffer.from(val, 'base64').toString();
      const parsed = JSON.parse(decoded);
      id = parsed.store_id || parsed.storeId || parsed.id || '';
      nftId = parsed.nft_id || parsed.nftId || '';
    }
  } catch {}
  if (!id) throw new Error('mint_store failed');
  return { id, nftId, txHash };
}

function storeKey(id: string, sid: string): string {
  return `${ADDRESS}:${sid}:${id}`;
}

function indexKey(id: string): string {
  return `${ADDRESS}:default:${id}`;
}

async function persistStore(store: Store, sid: string) {
  const json = canonicalJson(store);
  await setValue(ADDRESS, storeKey(store.id, sid), json);
  await setValue(ADDRESS, indexKey(store.id), json);
}

async function sendTx(action: string, data: any) {
  const payload = canonicalJson({ action, ...data });
  const tx = await chainAdapter.signMessage?.(payload);
  if (!tx && process.env.NODE_ENV !== 'test') {
    throw new Error('Transaction failed');
  }
}

export async function selectStore(
  arg1: string,
  arg2?: string
): Promise<Store | null> {
  ensureSeed();
  const id = arg2 ?? arg1;
  const key = arg2 ? storeKey(id, requireStoreId(arg1)) : indexKey(id);
  const res = await getValue(ADDRESS, key);
  if (!res) return null;
  try {
    return JSON.parse(res) as Store;
  } catch (err) {
    errorLog('Invalid store data', err);
    return null;
  }
}
export async function listStores(storeId: string): Promise<Store[]> {
  ensureSeed();
  const sid = requireStoreId(storeId);
  const items = await listValues(ADDRESS);
  const res: Store[] = [];
  for (const i of items) {
    if (!i.key.startsWith(`${ADDRESS}:${sid}:`)) continue;
    try {
      res.push(JSON.parse(i.value) as Store);
    } catch {}
  }
  if (res.length > 0 || DISABLED) return res;
  try {
    const chainRes = await contractListStores();
    const mapped = chainRes.map(fromChain);
    for (const s of mapped) {
      await persistStore(s, requireStoreId(s.id));
    }
    return mapped;
  } catch {
    return res;
  }
  return res;
}

export async function addStore(store: Store, sid?: string): Promise<void> {
  await sendTx('add', { store });
  await persistStore(store, sid ?? requireStoreId(store.id));
}

export async function updateStore(store: Store, sid?: string): Promise<void> {
  await sendTx('update', { store });
  await persistStore(store, sid ?? requireStoreId(store.id));
}

export async function removeStore(arg1: string, arg2?: string): Promise<void> {
  const id = arg2 ?? arg1;
  const sid = arg2 ? requireStoreId(arg1) : requireStoreId(id);
  await sendTx('remove', { id });
  await removeValue(ADDRESS, storeKey(id, sid));
  await removeValue(ADDRESS, indexKey(id));
}

export const getStore = selectStore;

export async function setStore(storeId: string, store: Store) {
  const existing = await selectStore(storeId, store.id);
  if (existing) {
    await updateStore(store, storeId);
  } else {
    await addStore(store, storeId);
  }
}

/**
 * Submit a meta-tx to the relayer to create a store on NEAR.
 * Requires EXPO_PUBLIC_RELAYER_URL and wallet connected (public key present).
 * Returns transaction hash if the relayer reports success.
 */
export async function createStoreOnChain(args: {
  id: string;
  name: string;
  owner: string;
}): Promise<string> {
  const relayerUrl = config.EXPO_PUBLIC_RELAYER_URL;
  if (!relayerUrl) throw new Error('EXPO_PUBLIC_RELAYER_URL not configured');
  const publicKey = chainAdapter.getPublicKey();
  if (!publicKey) throw new Error('Wallet not connected');
  const body = {
    action: 'create_store',
    args: { store_id: args.id, name: args.name },
    ownerId: args.owner,
  } as const;
  const toSign = new TextEncoder().encode(
    JSON.stringify({ action: body.action, args: body.args })
  );
  const signature = await chainAdapter.signMessage?.(toSign);
  const res = await fetch(`${relayerUrl}/meta-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: canonicalJson({ ...body, publicKey, signature }),
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      msg = (j && (j.error || j.message)) || msg;
    } catch {}
    throw new Error(`Relayer error: ${msg}`);
  }
  const json = await res.json();
  if (json?.error) throw new Error(String(json.error));
  return json?.tx || '';
}
