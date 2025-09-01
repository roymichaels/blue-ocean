import React, { createContext, useContext, useMemo } from 'react';
import { useWakuClient, WakuClient } from '@/hooks/useWakuClient';

const WakuContext = createContext<WakuClient | null>(null);

export const useWaku = () => {
  const ctx = useContext(WakuContext);
  if (!ctx) {
    throw new Error('useWaku must be used within a WakuProvider');
  }
  return ctx;
};

interface Props {
  children: React.ReactNode;
}

export function WakuProvider({ children }: Props) {
  const client = useWakuClient();
  const value = useMemo(() => client, [client]);
  return <WakuContext.Provider value={value}>{children}</WakuContext.Provider>;
}
