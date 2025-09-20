import { assertNearChain, chainAdapter } from '@/services/chain';
import { listStores as contractListStores } from '@/services/nearStoreContract';
import { getSelector } from '@/services/walletSelector';
import { nearConfig } from '@/services/config';

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
}

export function createDefaultStoreServiceDeps(): StoreServiceDeps {
  return {
    chain: { assertNearChain, chainAdapter },
    contract: { listStores: contractListStores },
    walletSelector: { getSelector },
    config: {
      nearConfig,
      loadAppConfig: async () => (await import('@/config')).default,
    },
  };
}
