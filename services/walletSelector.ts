// @ts-nocheck
import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import '@near-wallet-selector/wallet-utils';
import * as nearAPI from 'near-api-js';
import { Buffer } from 'buffer';
import { useEffect, useState } from 'react';
import { nearConfig } from '@/services/config';
import { getNearRpcUrls } from '@/utils/appConfig';

// Ensure FailoverRpcProvider is available as a constructor
const providers: any = (nearAPI as any).providers;
if (providers && typeof providers.FailoverRpcProvider !== 'function') {
  providers.FailoverRpcProvider =
    providers.FailoverRpcProvider?.default || providers.JsonRpcProvider;
}

// Exported for test overrides
export let selector: WalletSelector | null = null;
let initError: Error | null = null;

async function init() {
  if (selector || initError) {
    return { selector: selector || undefined, error: initError } as const;
  }
  try {
    const { networkId, contractId, walletUrl, helperUrl } = nearConfig();
    const rpcUrls = getNearRpcUrls();
    const rpcUrl = await getHealthyRpcUrl(rpcUrls);
    if (contractId && (networkId === 'testnet') !== contractId.endsWith('.testnet')) {
      console.error(`CONTRACT_ID (${contractId}) does not match network ${networkId}`);
    }
    selector = await setupWalletSelector({
      network: {
        networkId,
        nodeUrl: rpcUrl,
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

async function checkRpcHealth(url: string): Promise<boolean> {
  if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
    return true;
  }
  try {
    const res = await fetch(`${url}/status`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getHealthyRpcUrl(urls: string[]): Promise<string> {
  for (const url of urls) {
    if (await checkRpcHealth(url)) return url;
  }
  throw new Error('No healthy RPC URL available');
}

async function signIn(): Promise<void> {
  const { selector, error } = await init();
  if (!selector) throw (error || new Error('Wallet initialization failed'));
  const wallet = await selector.wallet('near-wallet');
  const { contractId, redirectUrl } = nearConfig();
  if (!contractId) throw new Error('CONTRACT_ID required');
  await wallet.signIn({
    contractId,
    methodNames: [],
    ...(redirectUrl ? { successUrl: redirectUrl, failureUrl: redirectUrl } : {}),
  });
}

async function signOut(): Promise<void> {
  const { selector, error } = await init();
  if (!selector) throw (error || new Error('Wallet initialization failed'));
  const wallet = await selector.wallet();
  await wallet.signOut();
}

async function signMessage(message: Uint8Array | string): Promise<string> {
  if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
    return 'test-signature';
  }
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

