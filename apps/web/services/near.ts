import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';

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
  }

  return { selector, error: initError } as const;
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
