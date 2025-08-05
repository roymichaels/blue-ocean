import React, { createContext, useContext, ReactNode } from 'react';
import { useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  user: any | null;
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
  const wallet = useTonWallet();
  const address = useTonAddress();

  React.useEffect(() => {
    tonConnectUI.connectionRestore();
  }, [tonConnectUI]);

  const login = async () => {
    openModal();
  };

  const signup = login;

  const logout = async () => {
    await tonConnectUI.disconnect();
  };

  const user = address ? { id: address, address } : null;

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!address,
        isAdmin: false,
        isDriver: false,
        user,
        loading: false,
        login,
        signup,
        logout,
        checkAuthState: async () => {},
        refreshSession: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
