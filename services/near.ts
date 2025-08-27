import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupModal, WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import { useEffect, useState } from 'react';

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

  modal = setupModal(selector, {
    contractId: 'example.testnet',
  });

  return { selector, modal };
}

export async function openModal() {
  const { modal } = await initNear();
  modal.show();
}

export function useNearAccount() {
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    initNear().then(({ selector }) => {
      const update = (state: any) => {
        setAccountId(state.accounts[0]?.accountId || null);
      };
      update(selector.store.getState());
      subscription = selector.store.observable.subscribe(update);
    });

    return () => subscription?.unsubscribe();
  }, []);

  return accountId;
}

export function getSelector() {
  return selector;
}

export function getModal() {
  return modal;
}

export default { initNear, openModal, getSelector, getModal };
