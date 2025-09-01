import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useNearAccount, openModal, getSelector } from '@/services/near';

interface WalletContextValue {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  connect: async () => {},
  disconnect: async () => {},
});

export const useWallet = () => useContext(WalletContext);

interface Props {
  children: React.ReactNode;
}

export function WalletProvider({ children }: Props) {
  const address = useNearAccount();

  const connect = useCallback(async () => {
    await openModal();
  }, []);

  const disconnect = useCallback(async () => {
    const selector = getSelector();
    const wallet = await selector?.wallet();
    await wallet?.signOut();
  }, []);

  const value = useMemo(
    () => ({ address, connect, disconnect }),
    [address, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
