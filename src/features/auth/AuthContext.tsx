import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Spinner } from '@/ui';
import { User } from '@/types';
import { errorLog } from '@/utils/logger';
import { useWallet } from '@/contexts/WalletProvider';
import usersAgent from '@/agents/users-agent';
import { getEd25519KeyPair } from '@/services/localIdentity';
import { t } from '@/i18n';
import { Buffer } from 'buffer';
import { getUser as getChainUser, setUser as setChainUser } from './services/nearUsers';

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  isStoreOwner: boolean;
  isPlatformAdmin: boolean;
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  signup: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isAdmin: false,
  isDriver: false,
  isStoreOwner: false,
  isPlatformAdmin: false,
  user: null,
  loading: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  checkAuthState: async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps { children: ReactNode }

export function AuthProvider({ children }: AuthProviderProps) {
  const { address, connect, disconnect } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  const checkAuthState = async () => {
    const walletAddress = address;

    if (!walletAddress) {
      // Wallet not connected – ensure we clear any stale user data
      setUser(null);
      return;
    }

    try {
      let profile = await getChainUser(walletAddress);

      // Ensure a Waku key pair exists and retrieve the public key
      const { publicKey } = await getEd25519KeyPair();
      const chatPublicKey = Buffer.from(publicKey).toString('hex');

      if (profile) {
        const roleChanged = user?.role !== profile.role;
        if (profile.chatPublicKey !== chatPublicKey || roleChanged) {
          profile = { ...profile, chatPublicKey };
          await setChainUser(profile);
          await usersAgent.update(profile);
        }
      } else {
        profile = {
          id: walletAddress,
          username: walletAddress,
          displayName: walletAddress,
          isAdmin: false,
          address: walletAddress,
          role: 'user',
          chatPublicKey,
        };
        await setChainUser(profile);
        await usersAgent.add(profile);
      }
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  const refreshSession = async () => {
    // Re-check the authentication state when recovering from a lost
    // connection or after the wallet reconnects.
    if (!address) {
      setUser(null);
      return;
    }

    await checkAuthState();
  };

  useEffect(() => {
    checkAuthState().finally(() => setInitialized(true));
  }, [address]);

  const login = async () => {
    try {
      await connect();
    } catch (err: unknown) {
      errorLog(
        t('auth.walletConnectionFailed', 'Wallet connection failed'),
        err,
      );
      Alert.alert(
        t('common.error', 'Error'),
        t(
          'auth.walletConnectionFailedTry',
          'Wallet connection failed. Please try again.',
        ),
      );
    }
  };

  const signup = login;

  const logout = async () => {
    try {
      await disconnect();
    } catch (err) {
      errorLog(t('auth.logoutFailed', 'Logout failed'), err);
    }
  };

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isDriver = role === 'driver';
  const isStoreOwner = role === 'store-owner';
  const isPlatformAdmin = role === 'platform-admin';

  if (!initialized) {
    return <Spinner />;
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!address,
        isAdmin,
        isDriver,
        isStoreOwner,
        isPlatformAdmin,
        user,
        loading: false,
        login,
        signup,
        logout,
        checkAuthState,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
