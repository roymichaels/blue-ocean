// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { chainAdapter as ChainAdapter } from '@/services/chain';
import type { getSelector } from '@/services/walletSelector';
import type { nearConfig } from '@/hooks/config';
import { notImplemented } from '@/services/nearStub';

export interface MintStoreResult {
  id: string;
  nftId: string;
  txHash: string;
}

export interface StoreChainClientDeps {
  assertNearChain: () => void;
  getSelector: typeof getSelector;
  nearConfig: typeof nearConfig;
  chainAdapter: typeof ChainAdapter;
  loadAppConfig: () => Promise<typeof import('@/config').default>;
  fetchFn?: typeof fetch;
}

export class StoreChainClient {
  constructor(_deps: StoreChainClientDeps) {
    notImplemented('StoreChainClient');
  }

  async mintStore(_name: string): Promise<MintStoreResult> {
    return notImplemented('StoreChainClient.mintStore');
  }

  async submitMutation(_action: string, _data: Record<string, unknown>): Promise<void> {
    return notImplemented('StoreChainClient.submitMutation');
  }

  async createStoreOnChain(_args: { id: string; name: string; owner: string }): Promise<string> {
    return notImplemented('StoreChainClient.createStoreOnChain');
  }
}

export function createStoreChainClient(_deps: StoreChainClientDeps): StoreChainClient {
  return notImplemented('createStoreChainClient');
}
