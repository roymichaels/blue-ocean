import ensureNearWallet from './ensureNearWallet';

type WalletSession = Awaited<ReturnType<typeof ensureNearWallet>>;

export function createWalletGuard(message: string): () => Promise<WalletSession> {
  return () => ensureNearWallet(message);
}

export type { WalletSession };
