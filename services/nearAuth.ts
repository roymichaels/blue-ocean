// @ts-nocheck
import { useEffect, useState } from 'react';
import type { WalletSelector, WalletSelectorModal } from '@near-wallet-selector/core';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import '@near-wallet-selector/wallet-utils';
import { Buffer } from 'buffer';

let selector: WalletSelector | null = null;
let modal: WalletSelectorModal | null = null;

async function init() {
  if (!selector || !modal) {
    selector = await setupWalletSelector({
      network: 'testnet',
      modules: [setupNearWallet()],
    });
    modal = setupModal(selector, { contractId: 'example.testnet' });
  }
  return { selector: selector!, modal: modal! };
}

export async function signIn(): Promise<void> {
  const { modal } = await init();
  modal.show();
}

export async function signOut(): Promise<void> {
  const { selector } = await init();
  const wallet = await selector.wallet();
  await wallet.signOut();
}

export async function signMessage(message: Uint8Array | string): Promise<string> {
  const { selector } = await init();
  const wallet = await selector.wallet();
  const res = await wallet.signMessage({
    message: typeof message === 'string' ? Buffer.from(message) : message,
  });
  return res.signature;
}

export function useAccountId(): string | null {
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    init().then(({ selector }) => {
      const update = (state: any) => {
        setAccountId(state.accounts[0]?.accountId || null);
      };
      update(selector.store.getState());
      sub = selector.store.observable.subscribe(update);
    });
    return () => sub?.unsubscribe();
  }, []);

  return accountId;
}

export function getAccountId(): string | null {
  return selector?.store.getState().accounts[0]?.accountId || null;
}

export default {
  signIn,
  signOut,
  signMessage,
  getAccountId,
};

