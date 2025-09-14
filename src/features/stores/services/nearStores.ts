import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { Store } from '@/types';
import { assertNearChain } from '@/services/chain';
import { requireStoreId } from '@blue-ocean/utils';
import { canonicalJson } from '@/utils/serialization';
import { nearConfig } from '@/services/config';
import { getSelector } from '@/services/walletSelector';
import { Buffer } from 'buffer';

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
      let hasAlpha = false;
      for (const s of data.stores as Store[]) {
        if (s.id === 'alpha') hasAlpha = true;
        // Index under a shared namespace so listStores('default') works
        void setValue(ADDRESS, `${ADDRESS}:default:${s.id}`, canonicalJson(s));
        // And index under its own namespace so getStore(id, id) resolves
        void setValue(ADDRESS, `${ADDRESS}:${s.id}:${s.id}`, canonicalJson(s));
      }
      if (!hasAlpha) {
        const alpha: Store = { id: 'alpha', name: 'Alpha Store', owner: 'demo', nftId: '', reputation: 0 } as Store;
        void setValue(ADDRESS, `${ADDRESS}:default:${alpha.id}`, canonicalJson(alpha));
        void setValue(ADDRESS, `${ADDRESS}:${alpha.id}:${alpha.id}`, canonicalJson(alpha));
      }
    }
  } catch {}
  SEEDED = true;
}

export async function mintStore(name: string): Promise<{ id: string; nftId: string; txHash: string }> {
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

export async function getStore(storeId: string, id: string): Promise<Store | null> {
  ensureSeed();
  const sid = requireStoreId(storeId);
  const res = await getValue(ADDRESS, `${ADDRESS}:${sid}:${id}`);
  if (res) return JSON.parse(res) as Store;
  if (DISABLED) {

    const fallback: Store = {
      id,
      name: `Store ${id}`,
      owner: 'demo',
      nftId: '',
      reputation: 0,
    } as Store;
    return fallback;
  }
  return null;
}

export async function setStore(storeId: string, store: Store) {
  const sid = requireStoreId(storeId);
  await setValue(ADDRESS, `${ADDRESS}:${sid}:${store.id}`, canonicalJson(store));
}

export async function removeStore(storeId: string, id: string) {
  const sid = requireStoreId(storeId);
  await removeValue(ADDRESS, `${ADDRESS}:${sid}:${id}`);
}
export async function listStores(storeId: string): Promise<Store[]> {
  ensureSeed();
  const sid = requireStoreId(storeId);
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${ADDRESS}:${sid}:`))
    .map((i) => JSON.parse(i.value) as Store);
}
