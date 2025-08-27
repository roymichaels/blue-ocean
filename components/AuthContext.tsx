import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  useTonConnectUI,
  useTonAddress,
  useIsConnectionRestored,
} from '@tonconnect/ui-react';
import DatabaseService from '../services/database';
import { User } from '../types';
import { errorLog } from '../utils/logger';

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
  const { openModal, tonConnectUI } = useTonConnectUI();
  const address = useTonAddress();
  const connectionRestored = useIsConnectionRestored();
  const [user, setUser] = useState<User | null>(null);

  const checkAuthState = async () => {
    const walletAddress = tonConnectUI.account?.address || address;

    if (!walletAddress) {
      // Wallet not connected – ensure we clear any stale user data
      setUser(null);
      return;
    }

    const db = DatabaseService.getInstance();

    try {
      const profile = await db.getUserProfile(walletAddress);
      setUser(
        profile || {
          id: walletAddress,
          username: walletAddress,
          displayName: walletAddress,
          isAdmin: false,
          address: walletAddress,
          role: 'user',
        },
      );
    } catch {
      // In case of any failure, fall back to clearing the user state
      setUser(null);
    }
  };

  const refreshSession = async () => {
    // Re-check the authentication state when recovering from a lost
    // connection or after the wallet reconnects.
    if (!tonConnectUI.account?.address && !address) {
      setUser(null);
      return;
    }

    await checkAuthState();
  };

  useEffect(() => {
    if (!connectionRestored) return;
    checkAuthState();
  }, [address, connectionRestored]);

  const login = async () => {
    try {
      await openModal();
    } catch (err: unknown) {
      errorLog('Wallet connection failed', err);
      Alert.alert('Error', 'Wallet connection failed. Please try again.');
    }
  };

  const signup = login;

  const logout = async () => {
    await tonConnectUI.disconnect();
  };

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isDriver = role === 'driver';
  const isStoreOwner = role === 'store-owner';
  const isPlatformAdmin = role === 'platform-admin';

  if (!connectionRestored) {
    return null;
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
