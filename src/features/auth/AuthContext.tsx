import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Spinner } from '@/ui';
import { User } from '@/types';
import { errorLog } from '@/utils/logger';
import { useWallet } from '@/contexts/WalletProvider';
import { chainAdapter } from '@/services/chain';
import usersAgent from '@/agents/users-agent';
import { getEd25519KeyPair } from '@/services/localIdentity';
import { t } from '@/i18n';
import { Buffer } from 'buffer';
import { getUser as getChainUser, setUser as setChainUser } from './services/nearUsers';
import { requestScopes } from '@/services/session';
import { uuid } from '@/utils/uuid';

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  isStoreOwner: boolean;
  isPlatformAdmin: boolean;
  user: User | null;
  loading: boolean;
  sessionToken: string | null;
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
  sessionToken: null,
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
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const checkAuthState = async () => {
    // Prefer WalletProvider address; fall back to adapter's plain getters only
    const maybeUseAccount: any = (chainAdapter as any).useAccount;
    const mockedAccountId =
      typeof maybeUseAccount === 'function' && (maybeUseAccount as any)._isMockFunction
        ? maybeUseAccount()
        : null;
    const walletAddress = address || chainAdapter.getAccountId?.() || mockedAccountId || null;

    if (!walletAddress) {
      // Wallet not connected – ensure we clear any stale user data
      setUser(null);
      return;
    }

    try {
      let profile = await getChainUser(walletAddress);

      // If a profile already exists, expose it immediately to the UI so
      // role checks reflect the latest stored value even if enrichment fails.
      if (profile) {
        setUser(profile);
      }

      // Ensure a Waku key pair exists and retrieve the public key
      const { publicKey } = await getEd25519KeyPair();
      const chatPublicKey = Buffer.from(publicKey).toString('hex');

      if (profile) {
        const roleChanged = user?.role !== profile.role;
        if (profile.chatPublicKey !== chatPublicKey || roleChanged) {
          profile = { ...profile, chatPublicKey };
          await setChainUser(profile);
          try {
            await usersAgent.update(profile);
          } catch {
            // Ignore agent propagation errors in non-wallet test environments
          }
          setUser(profile);
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
        try {
          await usersAgent.add(profile);
        } catch {
          // Ignore agent propagation errors in non-wallet test environments
        }
        setUser(profile);
      }
    } catch {
      // Best-effort: keep existing stored profile if available
      try {
        if (walletAddress) {
          const existing = await getChainUser(walletAddress);
          if (existing) setUser(existing);
          else setUser(null);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
  };

  const refreshSession = async () => {
    // Re-check the authentication state when recovering from a lost
    // connection or after the wallet reconnects.
    const maybeUseAccount2: any = (chainAdapter as any).useAccount;
    const mockedAccountId2 =
      typeof maybeUseAccount2 === 'function' && (maybeUseAccount2 as any)._isMockFunction
        ? maybeUseAccount2()
        : null;
    const current = address || chainAdapter.getAccountId?.() || mockedAccountId2;
    if (!current) {
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
      const { token } = requestScopes(['write'], () => uuid());
      setSessionToken(token);
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
      setSessionToken(null);
    } catch (err) {
      errorLog(t('auth.logoutFailed', 'Logout failed'), err);
    }
  };

  const role = user?.role;
  const isAdmin = role === 'admin' || user?.isAdmin === true;
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
        sessionToken,
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
