import { assertNearChain, chainAdapter } from '@/services/chain';
import { listStores as contractListStores } from '@/services/nearStoreContract';
import { getSelector } from '@/services/walletSelector';
import { nearConfig } from '@/services/config';
import {
  createStoreChainClient,
  type StoreChainClient,
} from './storeChainClient';

export interface StoreServiceDeps {
  chain: {
    assertNearChain: () => void;
    chainAdapter: typeof chainAdapter;
  };
  contract: {
    listStores: typeof contractListStores;
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
  const config = {
    nearConfig,
    loadAppConfig: async () => (await import('@/config')).default,
  } as const;
  return {
    chain: { assertNearChain, chainAdapter },
    contract: { listStores: contractListStores },
    walletSelector: { getSelector },
    config,
    storeChainClient: createStoreChainClient({
      assertNearChain,
      getSelector,
      nearConfig,
      chainAdapter,
      loadAppConfig: config.loadAppConfig,
    }),
  };
}
