import { Store } from '@/types';
import { assertNearChain } from '@/services/chain';
import { requireStoreId } from '@blue-ocean/utils';
import {
  mintStore as contractMintStore,
  getStore as contractGetStore,
  listStores as contractListStores,
} from '@/services/nearStoreContract';

assertNearChain();

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

export async function getStore(
  storeId: string,
  id: string,
): Promise<Store | null> {
  requireStoreId(storeId);
  try {
    const res = await contractGetStore(id);
    return res ? fromChain(res) : null;
  } catch (e: any) {
    throw new Error(`Failed to get store ${id}: ${e.message || e}`);
  }
}

export async function setStore(storeId: string, store: Store) {
  requireStoreId(storeId);
  try {
    await contractMintStore({
      id: store.id,
      name: store.name,
      owner_id: store.owner,
      nft_id: store.nftId,
      reputation: store.reputation,
    });
  } catch (e: any) {
    throw new Error(`Failed to mint store ${store.id}: ${e.message || e}`);
  }
}

export async function removeStore(_storeId: string, _id: string) {
  throw new Error('removeStore is not supported on-chain');
}

export async function listStores(storeId: string): Promise<Store[]> {
  requireStoreId(storeId);
  try {
    const res = await contractListStores();
    return res.map(fromChain);
  } catch (e: any) {
    throw new Error(`Failed to list stores: ${e.message || e}`);
  }
}
