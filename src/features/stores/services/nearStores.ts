// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { Store } from '@/types';
import type { DiffMessage } from '@/services/warmCache';
import type { StoreServiceDeps } from './storeServiceDeps';
import type { MintStoreResult } from './storeChainClient';
import { notImplemented } from '@/services/nearStub';

const stub = (name: string) => notImplemented(name);

type StoreListener = (stores: ReadonlyArray<Store>) => void;
type StoreErrorListener = (error: unknown) => void;

export interface StoreListStream {
  read(): Promise<ReadonlyArray<Store>>;
  getSnapshot(): ReadonlyArray<Store>;
  subscribe(listener: StoreListener): () => void;
  onError(listener: StoreErrorListener): () => void;
  [Symbol.asyncIterator](): AsyncIterator<ReadonlyArray<Store>>;
}

export const storesWarmCache: any = {
  getById: (..._args: any[]) => stub('storesWarmCache.getById'),
  list: (..._args: any[]) => stub('storesWarmCache.list'),
  subscribe: (..._args: any[]) => stub('storesWarmCache.subscribe'),
  mutate: (..._args: any[]) => stub('storesWarmCache.mutate'),
  onSynced: (..._args: any[]) => stub('storesWarmCache.onSynced'),
};

export async function mintStore(_name: string, _deps?: StoreServiceDeps): Promise<MintStoreResult> {
  return stub('mintStore');
}

export async function selectStore(
  _arg1: string,
  _arg2?: string | StoreServiceDeps,
  _maybeDeps?: StoreServiceDeps,
): Promise<Store | null> {
  return stub('selectStore');
}

export function listStores(
  _storeId: string,
  _deps?: StoreServiceDeps,
): StoreListStream {
  return stub('listStores');
}

export async function addStore(
  _store: Store,
  _sid?: string,
  _deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null> {
  return stub('addStore');
}

export async function updateStore(
  _store: Store,
  _sid?: string,
  _deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null> {
  return stub('updateStore');
}

export async function removeStore(
  _arg1: string,
  _arg2?: string,
  _deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null> {
  return stub('removeStore');
}

export async function setStore(
  _storeId: string,
  _store: Store,
  _deps?: StoreServiceDeps,
): Promise<DiffMessage<Store> | null> {
  return stub('setStore');
}

export function createStoreService(_deps?: StoreServiceDeps) {
  return stub('createStoreService');
}

export async function createStoreOnChain(
  _args: { id: string; name: string; owner: string },
  _deps?: StoreServiceDeps,
): Promise<string> {
  return stub('createStoreOnChain');
}

export { createDefaultStoreServiceDeps } from './storeServiceDeps';
export { seedStoreCache, setStoreCacheSeedEnabled } from './storeCache';
export type { MintStoreResult } from './storeChainClient';
