import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import { useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import { payPrivately as nearPayPrivately } from '@blue-ocean/sdk-near';
import { listOrdersBySeller as nearListOrdersBySeller } from '@/services/nearOrders';
import type { ChainAdapter } from './ChainAdapter';

let selector: WalletSelector | null = null;
let initError: Error | null = null;

async function init() {
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
  }
  return { selector, error: initError } as const;
}

async function openModal() {
  const { selector, error } = await init();
  if (!selector) {
    throw (error || new Error('Wallet initialization failed'));
  }
  const wallet = await selector.wallet('near-wallet');
  const contractId = process.env.EXPO_PUBLIC_CONTRACT_ID || 'example.testnet';
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin + (window.location.pathname || '/')
    : undefined;
  await (wallet as any).signIn({
    contractId,
    methodNames: [],
    ...(baseUrl ? { successUrl: baseUrl, failureUrl: baseUrl } : {}),
  });
}

function useAccount(): string | null {
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    init().then(({ selector }) => {
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

function useAccountId(): string | null {
  return useAccount();
}

function getAccountId(): string | null {
  return selector?.store.getState().accounts[0]?.accountId || null;
}

function getPublicKey(): string | null {
  return selector?.store.getState().accounts[0]?.publicKey || null;
}

function getSelector() {
  return selector;
}

async function getBalance(address: string): Promise<string> {
  const network = process.env.EXPO_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  const rpcUrl = network === 'mainnet' ? 'https://rpc.mainnet.near.org' : 'https://rpc.testnet.near.org';
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'query',
      params: {
        request_type: 'view_account',
        finality: 'final',
        account_id: address,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch balance: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.result?.amount || '0';
}

async function signMessage(message: Uint8Array | string): Promise<string> {
  const { selector, error } = await init();
  if (!selector) {
    throw (error || new Error('Wallet initialization failed'));
  }
  const wallet = await selector.wallet();
  const res: any = await (wallet as any).signMessage({
    message: typeof message === 'string' ? Buffer.from(message) : message,
  });
  return res.signature as string;
}

export const nearAdapter: ChainAdapter = {
  init,
  openModal,
  useAccount,
  useAccountId,
  getAccountId,
  getPublicKey,
  getSelector,
  getBalance,
  signMessage,
  listOrdersBySeller: nearListOrdersBySeller,
  payPrivately: nearPayPrivately,
};

export default nearAdapter;
