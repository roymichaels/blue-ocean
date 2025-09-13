import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { chainAdapter } from '@/services/chain';
import { getUser } from '@/features/auth/services/nearUsers';

interface WalletContextValue {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sign: (message: Uint8Array | string) => Promise<string>;
  fetchRole: (accountId?: string) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  connect: async () => {},
  disconnect: async () => {},
  sign: async () => '',
  fetchRole: async () => null,
});

export const useWallet = () => useContext(WalletContext);

interface Props {
  children: React.ReactNode;
}

export function WalletProvider({ children }: Props) {
  const account = typeof (chainAdapter as any).useAccount === 'function'
    ? (chainAdapter as any).useAccount()
    : null;
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(account);
  }, [account]);

  useEffect(() => {
    (async () => {
      await chainAdapter.init();
      const id = chainAdapter.getAccountId();
      if (id) setAddress(id);
    })();
  }, []);

  const connect = useCallback(async () => {
    const { error } = await chainAdapter.init();
    if (error) {
      console.error('Wallet initialization failed:', error);
      return;
    }
    await chainAdapter.openModal();
  }, []);

  const disconnect = useCallback(async () => {
    const selector = chainAdapter.getSelector();
    const wallet = await selector?.wallet();
    await wallet?.signOut();
  }, []);

  const sign = useCallback(async (message: Uint8Array | string) => {
    if (!chainAdapter.signMessage) {
      throw new Error('signMessage not implemented');
    }
    return chainAdapter.signMessage(message);
  }, []);

  const fetchRole = useCallback(async (accountId?: string) => {
    const id = accountId || chainAdapter.getAccountId();
    if (!id) return null;
    const user = await getUser(id);
    return user?.role ?? null;
  }, []);

  const value = useMemo(
    () => ({ address, connect, disconnect, sign, fetchRole }),
    [address, connect, disconnect, sign, fetchRole],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export default WalletContext;
