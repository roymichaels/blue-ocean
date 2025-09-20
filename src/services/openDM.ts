import chain, { chainAdapter } from '@/services/chain';
import chatAgent from '@/agents/chat-agent';
import { errorLog } from '@/utils/logger';
import type { Store, User } from '@/types';

let getStore: ((storeId: string, id: string) => Promise<Store | null>) | undefined;
let getUser: ((id: string) => Promise<User | null>) | undefined;

if (chain === 'near') {
  try {
    const nearStores = require('@/features/stores/services/nearStores');
    const service = nearStores.createStoreService(
      nearStores.createDefaultStoreServiceDeps(),
    );
    getStore = service.selectStore;
  } catch (err) {
    errorLog('Failed to load store service for messaging', err);
  }
  try {
    ({ getUser } = require('@/features/auth/services/nearUsers'));
  } catch (err) {
    errorLog('Failed to load user service for messaging', err);
  }
}

function resolveRoomId(buyer: string, seller: string): string {
  return `${buyer}-${seller}`;
}

export async function openDM(storeId: string): Promise<string> {
  if (!storeId) {
    throw new Error('INVALID_STORE');
  }

  const buyerAddress = chainAdapter.getAccountId();
  if (!buyerAddress) {
    throw new Error('WALLET_REQUIRED');
  }

  let sellerAddress = storeId;
  let sellerName = storeId;
  let sellerPublicKey: string | undefined;

  if (getStore) {
    try {
      const store = await getStore(storeId, storeId);
      if (store) {
        sellerName = store.name || sellerName;
        sellerAddress = store.owner || sellerAddress;
        if (getUser && store.owner) {
          try {
            const owner = await getUser(store.owner);
            if (owner?.chatPublicKey) {
              sellerPublicKey = owner.chatPublicKey;
            }
          } catch (err) {
            errorLog('Failed to fetch store owner profile for messaging', err);
          }
        }
      }
    } catch (err) {
      errorLog('Failed to load store details for messaging', err);
    }
  }

  await chatAgent.openChat(buyerAddress, sellerAddress, sellerName, sellerPublicKey);
  return resolveRoomId(buyerAddress, sellerAddress);
}

export default openDM;
