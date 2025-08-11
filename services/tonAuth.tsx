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
let tonConnect: TonConnectUI | null = null;

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

export default {
  getTonConnect,
  requestSignature,
  openModal,
  getTonPublicKey,
  getAddress,
};
