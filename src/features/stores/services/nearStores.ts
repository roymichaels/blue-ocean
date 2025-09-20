import type { Store } from '@/types';
import { requireStoreId } from '@blue-ocean/utils';
import { canonicalJson } from '@/utils/serialization';
import {
  getValue,
  setValue,
  listValues,
  removeValue,
} from '@/services/nearKvStore';
import { errorLog } from '@/utils/logger';
import {
  createDefaultStoreServiceDeps,
  type StoreServiceDeps,
} from './storeServiceDeps';
import {
  STORE_CACHE_ADDRESS,
  storeCacheRepository,
  storeCacheIndexKey,
  storeCacheKey,
} from './storeCache';


const DISABLED = false;

const defaultDeps = createDefaultStoreServiceDeps();

function resolveDeps(deps?: StoreServiceDeps): StoreServiceDeps {
  return deps ?? defaultDeps;
}

function decodeBase64String(value: string): string {
  const globalObj: any = globalThis as any;
  const BufferCtor = globalObj?.Buffer;
  if (BufferCtor?.from) {
    try {
      return BufferCtor.from(value, 'base64').toString('utf-8');
    } catch {
      // fall through
    }
  }
  if (typeof globalObj?.atob === 'function') {
    try {
      const binary = globalObj.atob(value);
      if (typeof globalObj.TextDecoder === 'function') {
        const decoder = new globalObj.TextDecoder();
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return decoder.decode(bytes);
      }
      return binary;
    } catch {
      try {
        return globalObj.atob(value);
      } catch {
        // continue to fallback
      }
    }
  }
  return value;
}

export const storesWarmCache = {
  getById(id: string) {
    return storeCacheRepository.get(id);
  },
  list(filter?: (id: string, value: Store) => boolean) {
    return storeCacheRepository.list(filter);
  },
  subscribe(
    filter: (id: string, value: Store | undefined) => boolean,
    cb: (id: string, value: Store | undefined) => void,
  ) {
    return storeCacheRepository.subscribe(filter, cb);
  },
  mutate(cmd: Parameters<typeof storeCacheRepository.mutate>[0]) {
    return storeCacheRepository.mutate(cmd);
  },
  onSynced(cb: (event?: { cache: string }) => void) {
    return storeCacheRepository.onSynced(cb);
  },
};

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
  name: string,
  deps?: StoreServiceDeps,
): Promise<{ id: string; nftId: string; txHash: string }> {
  const resolved = resolveDeps(deps);
  resolved.chain.assertNearChain();
  const { contractId } = resolved.config.nearConfig();
  if (!contractId) throw new Error('CONTRACT_ID required');
  const selector = resolved.walletSelector.getSelector();
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
      const decoded = decodeBase64String(val);
      const parsed = JSON.parse(decoded);
      id = parsed.store_id || parsed.storeId || parsed.id || '';
      nftId = parsed.nft_id || parsed.nftId || '';
    }
  } catch {}
  if (!id) throw new Error('mint_store failed');
  return { id, nftId, txHash };
}

async function persistStore(store: Store, sid: string) {
  const json = canonicalJson(store);
  await setValue(STORE_CACHE_ADDRESS, storeCacheKey(store.id, sid), json);
  await setValue(STORE_CACHE_ADDRESS, storeCacheIndexKey(store.id), json);
}

async function sendTx(action: string, data: any, deps: StoreServiceDeps) {
  if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
    return;
  }
  const payload = canonicalJson({ action, ...data });
  deps.chain.assertNearChain();
  const tx = await deps.chain.chainAdapter.signMessage?.(payload);
  if (!tx) {
    throw new Error('Transaction failed');
  }
}
export function selectStore(
  arg1: string,
  deps?: StoreServiceDeps,
): Promise<Store | null>;
export function selectStore(
  arg1: string,
  arg2: string,
  deps?: StoreServiceDeps,
): Promise<Store | null>;
export async function selectStore(
  arg1: string,
  arg2OrDeps?: string | StoreServiceDeps,
  maybeDeps?: StoreServiceDeps,
): Promise<Store | null> {
  const id = typeof arg2OrDeps === 'string' ? arg2OrDeps : arg1;
  const deps =
    (typeof arg2OrDeps === 'object' && arg2OrDeps)
      ? arg2OrDeps
      : maybeDeps;
  resolveDeps(deps);
  try {
    const cached = storeCacheRepository.get(id);
    if (cached) return cached;
  } catch {}
  const key =
    typeof arg2OrDeps === 'string'
      ? storeCacheKey(id, requireStoreId(arg1))
      : storeCacheIndexKey(id);
  const res = await getValue(STORE_CACHE_ADDRESS, key);
  if (!res) return null;
  try {
    return JSON.parse(res) as Store;
  } catch (err) {
    errorLog('Invalid store data', err);
    return null;
  }
}
export async function listStores(
  storeId: string,
  deps?: StoreServiceDeps,
): Promise<Store[]> {
  const sid = requireStoreId(storeId);
  try {
    const values = storeCacheRepository.list();
    if (sid === 'default') return values;
    const filtered = values.filter((store) => requireStoreId(store.id) === sid);
    if (filtered.length > 0) return filtered;
  } catch {}
  const items = await listValues(STORE_CACHE_ADDRESS);
  const res: Store[] = [];
  for (const i of items) {
    if (!i.key.startsWith(`${STORE_CACHE_ADDRESS}:${sid}:`)) continue;
    try {
      res.push(JSON.parse(i.value) as Store);
    } catch {}
  }
  if (res.length > 0 || DISABLED) return res;
  try {
    const resolved = resolveDeps(deps);
    resolved.chain.assertNearChain();
    const chainRes = await resolved.contract.listStores();
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

export async function addStore(
  store: Store,
  sid?: string,
  deps?: StoreServiceDeps,
): Promise<void> {
  const resolved = resolveDeps(deps);
  await sendTx('add', { store }, resolved);
  await persistStore(store, sid ?? requireStoreId(store.id));
}

export async function updateStore(
  store: Store,
  sid?: string,
  deps?: StoreServiceDeps,
): Promise<void> {
  const resolved = resolveDeps(deps);
  await sendTx('update', { store }, resolved);
  await persistStore(store, sid ?? requireStoreId(store.id));
}

export function removeStore(
  id: string,
  deps?: StoreServiceDeps,
): Promise<void>;
export function removeStore(
  arg1: string,
  arg2: string,
  deps?: StoreServiceDeps,
): Promise<void>;
export async function removeStore(
  arg1: string,
  arg2OrDeps?: string | StoreServiceDeps,
  maybeDeps?: StoreServiceDeps,
): Promise<void> {
  const id = typeof arg2OrDeps === 'string' ? arg2OrDeps : arg1;
  const sid =
    typeof arg2OrDeps === 'string'
      ? requireStoreId(arg1)
      : requireStoreId(id);
  const deps =
    (typeof arg2OrDeps === 'object' && arg2OrDeps)
      ? arg2OrDeps
      : maybeDeps;
  const resolved = resolveDeps(deps);
  await sendTx('remove', { id }, resolved);
  await removeValue(STORE_CACHE_ADDRESS, storeCacheKey(id, sid));
  await removeValue(STORE_CACHE_ADDRESS, storeCacheIndexKey(id));
}

export const getStore = selectStore;

export async function setStore(
  storeId: string,
  store: Store,
  deps?: StoreServiceDeps,
) {
  const resolved = resolveDeps(deps);
  const existing = await selectStore(storeId, store.id, resolved);
  if (existing) {
    await updateStore(store, storeId, resolved);
  } else {
    await addStore(store, storeId, resolved);
  }
}

export function createStoreService(
  deps: StoreServiceDeps = defaultDeps,
): {
  mintStore: (name: string) => Promise<{ id: string; nftId: string; txHash: string }>;
  selectStore: (arg1: string, arg2?: string) => Promise<Store | null>;
  listStores: (storeId: string) => Promise<Store[]>;
  addStore: (store: Store, sid?: string) => Promise<void>;
  updateStore: (store: Store, sid?: string) => Promise<void>;
  removeStore: (arg1: string, arg2?: string) => Promise<void>;
  setStore: (storeId: string, store: Store) => Promise<void>;
  createStoreOnChain: (args: { id: string; name: string; owner: string }) => Promise<string>;
} {
  const resolved = resolveDeps(deps);
  return {
    mintStore: (name: string) => mintStore(name, resolved),
    selectStore: (arg1: string, arg2?: string) =>
      typeof arg2 === 'string'
        ? selectStore(arg1, arg2, resolved)
        : selectStore(arg1, resolved),
    listStores: (storeId: string) => listStores(storeId, resolved),
    addStore: (store: Store, sid?: string) => addStore(store, sid, resolved),
    updateStore: (store: Store, sid?: string) => updateStore(store, sid, resolved),
    removeStore: (arg1: string, arg2?: string) =>
      typeof arg2 === 'string'
        ? removeStore(arg1, arg2, resolved)
        : removeStore(arg1, resolved),
    setStore: (storeId: string, store: Store) => setStore(storeId, store, resolved),
    createStoreOnChain: (args: { id: string; name: string; owner: string }) =>
      createStoreOnChain(args, resolved),
  };
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
}, deps?: StoreServiceDeps): Promise<string> {
  const resolved = resolveDeps(deps);
  const appConfig = await resolved.config.loadAppConfig();
  const relayerUrl = appConfig.EXPO_PUBLIC_RELAYER_URL;
  if (!relayerUrl) throw new Error('EXPO_PUBLIC_RELAYER_URL not configured');
  resolved.chain.assertNearChain();
  const { chainAdapter } = resolved.chain;
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

export { createDefaultStoreServiceDeps } from './storeServiceDeps';
export { seedStoreCache, setStoreCacheSeedEnabled } from './storeCache';






