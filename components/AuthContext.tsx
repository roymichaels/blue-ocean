import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import {
  useTonConnectUI,
  useTonAddress,
  useIsConnectionRestored,
} from '@tonconnect/ui-react';
import DatabaseService from '../services/database';
import { User } from '../types';

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDriver: boolean;
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
      setUser(null);
      return;
    }

    const db = DatabaseService.getInstance();
    const profile = await db.getUserProfile(walletAddress);

    setUser(
      profile || {
        id: walletAddress,
        username: walletAddress,
        displayName: walletAddress,
        isAdmin: false,
        address: walletAddress,
        role: 'user',
      }
    );
  };

  const refreshSession = async () => {
    await checkAuthState();
  };

  useEffect(() => {
    if (!connectionRestored) return;
    checkAuthState();
  }, [address, connectionRestored]);

  const login = async () => {
    openModal();
  };

  const signup = login;

  const logout = async () => {
    await tonConnectUI.disconnect();
  };

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isDriver = role === 'driver';

  if (!connectionRestored) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!address,
        isAdmin,
        isDriver,
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
