// @ts-nocheck
import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import { useEffect, useState } from 'react';
import { getListings, addListing, buyListing, payPrivately } from '@blue-ocean/sdk-near';

let selector: WalletSelector | null = null;
let initError: Error | null = null;

export async function initNear() {
  if (selector || initError) {
    return { selector, error: initError } as const;
  }
  try {
    selector = await setupWalletSelector({
      network: 'testnet',
      modules: [setupNearWallet()],
    });
  } catch (e: any) {
    initError = e instanceof Error ? e : new Error(String(e));
    // Don’t throw here; let callers decide how to handle missing wallet
  }
  return { selector, error: initError } as const;
}

// Backwards-compatible: previously opened modal; now triggers sign-in directly.
export async function openModal() {
  const { selector, error } = await initNear();
  if (!selector) {
    throw (error || new Error('Wallet initialization failed'));
  }
  const wallet = await selector.wallet('near-wallet');
  const contractId = process.env.EXPO_PUBLIC_CONTRACT_ID || 'example.testnet';
  await wallet.signIn({ contractId, methodNames: [] });
}

export function useNearAccount() {
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    initNear().then(({ selector }) => {
      if (!selector) return; // Wallet not available; stay null
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

// Kept for API shape compatibility; no-op now.
export function getModal() {
  return null as any;
}

export { getListings, addListing, buyListing, payPrivately };

export default {
  initNear,
  openModal,
  getSelector,
  getModal,
  getListings,
  addListing,
  buyListing,
  payPrivately,
};
