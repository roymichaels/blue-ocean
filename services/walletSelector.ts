// @ts-nocheck
import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import '@near-wallet-selector/wallet-utils';
import { Buffer } from 'buffer';
import { useEffect, useState } from 'react';
import { getContractId, getNetworkId } from '@/services/config';

// Exported for test overrides
export let selector: WalletSelector | null = null;
let initError: Error | null = null;

function getWalletUrl(): string {
  const override =
    process.env.EXPO_PUBLIC_NEAR_WALLET_URL ||
    process.env.NEAR_WALLET_URL;
  if (override) {
    const net = getNetworkId();
    if (override.includes('testnet') !== (net === 'testnet')) {
      console.error(`NEAR_WALLET_URL (${override}) does not match network ${net}`);
    }
    return override;
  }
  const net = getNetworkId();
  return net === 'mainnet'
    ? 'https://app.mynearwallet.com'
    : 'https://testnet.mynearwallet.com';
}

function getHelperUrl(): string {
  const override =
    process.env.EXPO_PUBLIC_NEAR_HELPER_URL ||
    process.env.NEAR_HELPER_URL;
  if (override) {
    const net = getNetworkId();
    if (override.includes('testnet') !== (net === 'testnet')) {
      console.error(`NEAR_HELPER_URL (${override}) does not match network ${net}`);
    }
    return override;
  }
  const net = getNetworkId();
  return net === 'mainnet'
    ? 'https://helper.mainnet.near.org'
    : 'https://helper.testnet.near.org';
}

async function init() {
  if (selector || initError) {
    return { selector: selector || undefined, error: initError } as const;
  }
  try {
    const networkId = getNetworkId();
    const cid = getContractId();
    if (cid && (networkId === 'testnet') !== cid.endsWith('.testnet')) {
      console.error(`CONTRACT_ID (${cid}) does not match network ${networkId}`);
    }
    const walletUrl = getWalletUrl();
    const helperUrl = getHelperUrl();
    selector = await setupWalletSelector({
      network: {
        networkId,
        nodeUrl: networkId === 'mainnet'
          ? 'https://rpc.mainnet.near.org'
          : 'https://rpc.testnet.near.org',
        walletUrl,
        helperUrl,
      },
      modules: [setupNearWallet({ walletUrl })],
    });
  } catch (e: any) {
    initError = e instanceof Error ? e : new Error(String(e));
  }
  return { selector: selector || undefined, error: initError } as const;
}

async function signIn(): Promise<void> {
  const { selector, error } = await init();
  if (!selector) throw (error || new Error('Wallet initialization failed'));
  const wallet = await selector.wallet('near-wallet');
  const contractId = getContractId();
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : undefined;
  await wallet.signIn({
    contractId,
    methodNames: [],
    ...(baseUrl ? { successUrl: baseUrl, failureUrl: baseUrl } : {}),
  });
}

async function signOut(): Promise<void> {
  const { selector, error } = await init();
  if (!selector) throw (error || new Error('Wallet initialization failed'));
  const wallet = await selector.wallet();
  await wallet.signOut();
}

async function signMessage(message: Uint8Array | string): Promise<string> {
  const { selector, error } = await init();
  if (!selector) throw (error || new Error('Wallet initialization failed'));
  const wallet = await selector.wallet();
  const res: any = await wallet.signMessage({
    message: typeof message === 'string' ? Buffer.from(message) : message,
  });
  return res.signature as string;
}

function useAccount(): string | null {
  const [accountId, setAccountId] = useState<string | null>(null);
  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    init().then(({ selector }) => {
      if (!selector) return;
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

const useAccountId = useAccount;

function getAccountId(): string | null {
  return selector?.store.getState().accounts[0]?.accountId || null;
}

function getPublicKey(): string | null {
  return selector?.store.getState().accounts[0]?.publicKey || null;
}

function getSelector() {
  return selector;
}

export {
  init,
  signIn,
  signOut,
  signMessage,
  useAccount,
  useAccountId,
  getAccountId,
  getPublicKey,
  getSelector,
};

export default {
  init,
  signIn,
  signOut,
  signMessage,
  useAccount,
  useAccountId,
  getAccountId,
  getPublicKey,
  getSelector,
};
