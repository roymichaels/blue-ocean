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
import type { CacheMutation, DiffMessage, WarmCache as WarmCacheType } from '@/services/warmCache';


const ADDRESS = 'stores';
const STORE_CACHE_TOPIC = '/blue-ocean/stores/1';
const DISABLED = false;
let SEEDED = false;
let chainEnsured = false;
type ChainModule = typeof import('@/services/chain');
let chainModule: ChainModule | null = null;
async function loadChainModule(): Promise<ChainModule> {
  if (!chainModule) {
    chainModule = await import('@/services/chain');
  }
  return chainModule;
}

async function ensureChain(): Promise<void> {
  if (chainEnsured) return;
  const { assertNearChain } = await loadChainModule();
  assertNearChain();
  chainEnsured = true;
}

type NearStoreContractModule = typeof import('@/services/nearStoreContract');
let nearStoreContractModule: NearStoreContractModule | null = null;
async function loadNearStoreContract(): Promise<NearStoreContractModule> {
  await ensureChain();
  if (!nearStoreContractModule) {
    nearStoreContractModule = await import('@/services/nearStoreContract');
  }
  return nearStoreContractModule;
}

type WalletSelectorModule = typeof import('@/services/walletSelector');
let walletSelectorModule: WalletSelectorModule | null = null;
async function loadWalletSelector(): Promise<WalletSelectorModule> {
  if (!walletSelectorModule) {
    walletSelectorModule = await import('@/services/walletSelector');
  }
  return walletSelectorModule;
}

type ConfigModule = typeof import('@/services/config');
let configModule: ConfigModule | null = null;
async function loadConfigModule(): Promise<ConfigModule> {
  if (!configModule) {
    configModule = await import('@/services/config');
  }
  return configModule;
}

type AppConfig = typeof import('@/config').default;
let cachedAppConfig: AppConfig | null = null;
type WarmCacheModule = typeof import('@/services/warmCache');
let warmCacheModule: WarmCacheModule | null = null;
let storeCacheInstance: WarmCacheType<Store> | null = null;

function ensureStoreCache(): WarmCacheType<Store> {
  if (!storeCacheInstance) {
    const mod: WarmCacheModule =
      warmCacheModule ??
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require('@/services/warmCache') as WarmCacheModule);
    warmCacheModule = mod;
    storeCacheInstance = mod.createWarmCache<Store>(STORE_CACHE_TOPIC, {
      hydrateLake: hydrateStoreLake,
    });
  }
  return storeCacheInstance;
}
async function loadAppConfig(): Promise<AppConfig> {
  if (!cachedAppConfig) {
    cachedAppConfig = (await import('@/config')).default;
  }
  return cachedAppConfig;
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

async function hydrateStoreLake(): Promise<Array<DiffMessage<Store>>> {
  try {
    const entries = await listValues(ADDRESS);
    const seen = new Map<string, DiffMessage<Store>>();
    for (const entry of entries) {
      try {
        const parsed = JSON.parse(entry.value) as Store & { rev?: number; version?: number };
        const keyParts = entry.key.split(':');
        const id = parsed.id || keyParts[keyParts.length - 1] || entry.key;
        if (!id) continue;
        const tsSource =
          (parsed.updatedAt && new Date(parsed.updatedAt).getTime()) ||
          (parsed.createdAt && new Date(parsed.createdAt).getTime()) ||
          Date.now();
        const ts = Number.isFinite(tsSource) ? tsSource : Date.now();
        const rev =
          (typeof parsed.rev === 'number' && parsed.rev) ||
          (typeof parsed.version === 'number' && parsed.version) ||
          1;
        const diff: DiffMessage<Store> = { id, rev, op: 'set', value: parsed, ts };
        if (!seen.has(id) || entry.key.includes(`:${id}`)) {
          seen.set(id, diff);
        }
      } catch (err) {
        errorLog('Invalid store snapshot', err);
      }
    }
    return Array.from(seen.values());
  } catch (err) {
    errorLog('Failed to hydrate stores from NEAR Lake', err);
    return [];
  }
}

export const storesWarmCache = {
  getById(id: string) {
    return ensureStoreCache().getById(id);
  },
  list(filter?: (id: string, value: Store) => boolean) {
    return ensureStoreCache().list(filter);
  },
  subscribe(
    filter: (id: string, value: Store | undefined) => boolean,
    cb: (id: string, value: Store | undefined) => void,
  ) {
    return ensureStoreCache().subscribe(filter, cb);
  },
  mutate(cmd: CacheMutation<Store>) {
    return ensureStoreCache().mutate(cmd);
  },
  onSynced(cb: (event?: { cache: string }) => void) {
    return ensureStoreCache().onSynced(cb);
  },
};

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
  await ensureChain();
  const { nearConfig } = await loadConfigModule();
  const { contractId } = nearConfig();
  if (!contractId) throw new Error('CONTRACT_ID required');
  const { getSelector } = await loadWalletSelector();
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
      const decoded = decodeBase64String(val);
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
  if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
    return;
  }
  const payload = canonicalJson({ action, ...data });
  await ensureChain();
  const { chainAdapter } = await loadChainModule();
  const tx = await chainAdapter.signMessage?.(payload);
  if (!tx) {
    throw new Error('Transaction failed');
  }
}
export async function selectStore(
  arg1: string,
  arg2?: string
): Promise<Store | null> {
  ensureSeed();
  const id = arg2 ?? arg1;
  try {
    const cached = storesWarmCache.getById(id);
    if (cached) return cached;
  } catch {}
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
  try {
    const values = ensureStoreCache().list();
    if (sid === 'default') return values;
    const filtered = values.filter((store) => requireStoreId(store.id) === sid);
    if (filtered.length > 0) return filtered;
  } catch {}
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
    await ensureChain();
    const { listStores: contractListStores } = await loadNearStoreContract();
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
  const appConfig = await loadAppConfig();
  const relayerUrl = appConfig.EXPO_PUBLIC_RELAYER_URL;
  if (!relayerUrl) throw new Error('EXPO_PUBLIC_RELAYER_URL not configured');
  await ensureChain();
  const { chainAdapter } = await loadChainModule();
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






