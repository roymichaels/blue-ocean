import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupModal, WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';

let selector: WalletSelector | null = null;
let modal: WalletSelectorModal | null = null;

export async function initNear() {
  if (selector && modal) {
    return { selector, modal };
  }

  selector = await setupWalletSelector({
    network: 'testnet',
    modules: [setupNearWallet()],
  });

  modal = setupModal(selector, { contractId: 'example.testnet' });
  return { selector, modal };
}

export async function getAccountId(): Promise<string | null> {
  const { selector } = await initNear();
  const state = selector.store.getState();
  return state.accounts[0]?.accountId || null;
}

export default {
  initNear,
  getAccountId,
};
