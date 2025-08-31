// @ts-nocheck
import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import { useEffect, useState } from 'react';

let selector: WalletSelector | null = null;
let initError: Error | null = null;

export async function initNear() {
  if (selector || initError) {
    return { selector, error: initError } as const;
  }
  try {
    const resolveNetwork = () => {
      const explicit = process.env.EXPO_PUBLIC_NETWORK;
      if (explicit === 'mainnet' || explicit === 'testnet') return explicit;
      const cid = process.env.EXPO_PUBLIC_CONTRACT_ID || '';
      return cid.endsWith('.testnet') ? 'testnet' : 'mainnet';
    };

    const getWalletUrl = () => {
      const override = process.env.EXPO_PUBLIC_WALLET_URL;
      if (override) return override;
      const net = resolveNetwork();
      return net === 'mainnet'
        ? 'https://app.mynearwallet.com'
        : 'https://testnet.mynearwallet.com';
    };

    selector = await setupWalletSelector({
      network: 'testnet',
      modules: [setupNearWallet({ walletUrl: getWalletUrl() })],
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
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin + (window.location.pathname || '/')
    : undefined;
  await wallet.signIn({
    contractId,
    methodNames: [],
    ...(baseUrl ? { successUrl: baseUrl, failureUrl: baseUrl } : {}),
  });
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

export default {
  initNear,
  openModal,
  getSelector,
  getModal,
};
