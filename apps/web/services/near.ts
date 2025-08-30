import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';

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
