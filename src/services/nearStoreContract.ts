// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import { notImplemented } from '@/services/nearStub';

export interface ChainStore {
  id: string;
  name: string;
  owner_id: string;
  nft_id: string;
  reputation?: number;
}

export async function getStore(_id: string): Promise<ChainStore | null> {
  return notImplemented('getStore');
}

export async function listStores(): Promise<ChainStore[]> {
  return notImplemented('listStores');
}

export async function mintStore(_store: ChainStore): Promise<string> {
  return notImplemented('mintStore');
}
