// @ts-nocheck
import { useEffect, useState } from 'react';
import type { WalletSelector } from '@near-wallet-selector/core';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import '@near-wallet-selector/wallet-utils';
import { Buffer } from 'buffer';
import { requireEnv } from '@/services/config';

// Expose for test injection where needed
export let selector: WalletSelector | null = null;
// Kept for backward-compatibility in tests; no longer used
export let modal: null = null;

async function init() {
  if (!selector) {
    // Resolve wallet URL: prefer env override, then infer from contract/network
    const resolveNetwork = () => {
      const explicit = process.env.EXPO_PUBLIC_NETWORK;
      if (explicit === 'mainnet' || explicit === 'testnet') return explicit;
      const cid = requireEnv('EXPO_PUBLIC_CONTRACT_ID', '');
      return cid.endsWith('.testnet') ? 'testnet' : 'mainnet';
    };
    const network = resolveNetwork();

    const getWalletUrl = () => {
      const override = requireEnv('EXPO_PUBLIC_WALLET_URL', '');
      if (override) return override;
      return network === 'mainnet'
        ? 'https://app.mynearwallet.com'
        : 'https://testnet.mynearwallet.com';
    };

    selector = await setupWalletSelector({
      network,
      modules: [setupNearWallet({ walletUrl: getWalletUrl() })],
    });
  }
  return selector!;
}

export async function signIn(): Promise<void> {
  const sel = await init();
  const wallet = await sel.wallet('near-wallet');
  const contractId = requireEnv('EXPO_PUBLIC_CONTRACT_ID', 'example.testnet');
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin + (window.location.pathname || '/')
    : undefined;
  await wallet.signIn({
    contractId,
    methodNames: [],
    ...(baseUrl ? { successUrl: baseUrl, failureUrl: baseUrl } : {}),
  });
}

export async function signOut(): Promise<void> {
  const sel = await init();
  const wallet = await sel.wallet();
  await wallet.signOut();
}

export async function signMessage(message: Uint8Array | string): Promise<string> {
  const sel = await init();
  const wallet = await sel.wallet();
  const res = await wallet.signMessage({
    message: typeof message === 'string' ? Buffer.from(message) : message,
  });
  return res.signature;
}

export function useAccountId(): string | null {
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    init().then((sel) => {
      const update = (state: any) => {
        setAccountId(state.accounts[0]?.accountId || null);
      };
      update(sel.store.getState());
      sub = sel.store.observable.subscribe(update);
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

