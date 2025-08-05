import React, { createContext, useContext, useState, ReactNode } from 'react';
import AuthTabsModal from './AuthTabsModal';

interface AuthModalContextType {
  openAuthModal: (initialTab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export const useAuthModal = () => useContext(AuthModalContext);

interface AuthModalProviderProps {
  children: ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const [visible, setVisible] = useState(false);
  const [initialTab, setInitialTab] = useState<'login' | 'signup'>('login');

  const openAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setInitialTab(tab);
    setVisible(true);
  };

  const closeAuthModal = () => {
    setVisible(false);
  };

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      <AuthTabsModal visible={visible} onClose={closeAuthModal} initialTab={initialTab} />
    </AuthModalContext.Provider>
  );
}
