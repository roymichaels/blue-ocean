import { TonConnectUI } from '@tonconnect/ui';
import {
  useTonWallet as useTCWallet,
  useTonAddress as useTCAddress,
  useTonConnectUI,
} from '@tonconnect/ui-react';
import React, {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';

// Global reference used by non-hook utilities (e.g. tests or legacy helpers)
export let tonConnect: TonConnectUI | null = null;

// React context to share the TonConnectUI instance across the app
const TonConnectContext = createContext<TonConnectUI | null>(null);

export const TonConnectProvider = ({ children }: { children: ReactNode }) => {
  const [tonConnectUI] = useTonConnectUI();

  // Keep the global reference in sync
  useEffect(() => {
    tonConnect = tonConnectUI;
  }, [tonConnectUI]);

  return React.createElement(
    TonConnectContext.Provider,
    { value: tonConnectUI },
    children,
  );
};

export const useTonWallet = useTCWallet;
export const useTonAddress = useTCAddress;

// Hook to access the TonConnectUI instance from context or directly
export const useTonConnect = () => {
  const context = useContext(TonConnectContext);
  const [tonConnectUI] = useTonConnectUI();
  const instance = context ?? tonConnectUI;

  useEffect(() => {
    tonConnect = instance;
  }, [instance]);

  return instance;
};

// Helper getters used outside React components
export const getTonConnect = () => tonConnect;

export const requestSignature = async (
  payload: any,
): Promise<string | null> => {
  if (!tonConnect) return null;
  const result = await tonConnect.signData(payload);
  return result.signature;
};

export const openModal = async (): Promise<void> => {
  if (!tonConnect) return;
  await tonConnect.openModal();
};

export const getTonPublicKey = (): string | null =>
  tonConnect?.account?.publicKey ?? null;

export const getAddress = (): string | null =>
  tonConnect?.account?.address ?? null;

/**
 * Direct access to a wallet's private key is extremely dangerous and should
 * never occur in production builds.  Instead, wallets expose signing APIs
 * that keep the key material inside the wallet.  For development and testing
 * scenarios only, the private key can be accessed by explicitly opting in via
 * the `ENABLE_UNSAFE_TON_PRIVATE_KEY` environment variable.  When the flag is
 * unset this function will always return `null`.
 */
export const getTonPrivateKey = (): string | null => {
  if (process.env.ENABLE_UNSAFE_TON_PRIVATE_KEY !== 'true') {
    return null;
  }
  return (tonConnect?.account as any)?.privateKey ?? null;
};

const api = {
  getTonConnect,
  requestSignature,
  openModal,
  getTonPublicKey,
  getAddress,
} as const;

if (process.env.ENABLE_UNSAFE_TON_PRIVATE_KEY === 'true') {
  (api as any).getTonPrivateKey = getTonPrivateKey;
}

export default api;
