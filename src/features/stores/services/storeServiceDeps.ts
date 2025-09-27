// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { chainAdapter as ChainAdapter } from '@/services/chain';
import type { getSelector } from '@/services/walletSelector';
import type { nearConfig } from '@/hooks/config';
import type { StoreChainClient } from './storeChainClient';
import { notImplemented } from '@/services/nearStub';

export interface StoreServiceDeps {
  chain: {
    assertNearChain: () => void;
    chainAdapter: typeof ChainAdapter;
  };
  contract: {
    listStores: (...args: any[]) => any;
  };
  walletSelector: {
    getSelector: typeof getSelector;
  };
  config: {
    nearConfig: typeof nearConfig;
    loadAppConfig: () => Promise<typeof import('@/config').default>;
  };
  storeChainClient: StoreChainClient;
}

export function createDefaultStoreServiceDeps(): StoreServiceDeps {
  return notImplemented('createDefaultStoreServiceDeps');
}
