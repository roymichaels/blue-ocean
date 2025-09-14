import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { Store } from '@/types';
import { chainAdapter, assertNearChain } from '@/services/chain';
import { requireStoreId } from '@blue-ocean/utils';
import { canonicalJson } from '@/utils/serialization';

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
        void persistStore(s);
      }
      if (!hasAlpha) {
        const alpha: Store = {
          id: 'alpha',
          name: 'Alpha Store',
          owner: 'demo',
          nftId: '',
          reputation: 0,
        } as Store;
        void persistStore(alpha);
      }
    }
  } catch {}
  SEEDED = true;
}

function storeKey(id: string, sid: string): string {
  return `${ADDRESS}:${sid}:${id}`;
}

function indexKey(id: string): string {
  return `${ADDRESS}:default:${id}`;
}

async function persistStore(store: Store) {
  const sid = requireStoreId(store.id);
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

export async function selectStore(arg1: string, arg2?: string): Promise<Store | null> {
  ensureSeed();
  const id = arg2 ?? arg1;
  const sid = arg2 ? requireStoreId(arg1) : requireStoreId(id);
  const res = await getValue(ADDRESS, storeKey(id, sid));
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

export async function listStores(storeId = 'default'): Promise<Store[]> {
  ensureSeed();
  const sid = requireStoreId(storeId);
  const items = await listValues(ADDRESS);
  return items
    .filter((i) => i.key.startsWith(`${ADDRESS}:${sid}:`))
    .map((i) => JSON.parse(i.value) as Store);
}

export async function addStore(store: Store): Promise<void> {
  await sendTx('add', { store });
  await persistStore(store);
}

export async function updateStore(store: Store): Promise<void> {
  await sendTx('update', { store });
  await persistStore(store);
}

export async function removeStore(arg1: string, arg2?: string): Promise<void> {
  const id = arg2 ?? arg1;
  const sid = arg2 ? requireStoreId(arg1) : requireStoreId(id);
  await sendTx('remove', { id });
  await removeValue(ADDRESS, storeKey(id, sid));
  await removeValue(ADDRESS, indexKey(id));
}

export const getStore = selectStore;

export async function setStore(_storeId: string, store: Store) {
  const existing = await selectStore(store.id);
  if (existing) {
    await updateStore(store);
  } else {
    await addStore(store);
  }
}

