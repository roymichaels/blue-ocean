import React, { createContext, useContext, useMemo } from 'react';
import { createCommerceClient } from '@/data/commerce';
import type { CommerceClient } from '@/data/commerce';
import { useAppMode } from './AppModeProvider';
import { getApiBaseUrl } from '@/application/config/appConfig';

const CommerceClientContext = createContext<CommerceClient | null>(null);

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useAppMode();
  const baseUrl = getApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  const client = useMemo(() => createCommerceClient(mode, baseUrl), [mode, baseUrl]);

  return <CommerceClientContext.Provider value={client}>{children}</CommerceClientContext.Provider>;
}

export function useCommerceClient(): CommerceClient {
  const client = useContext(CommerceClientContext);
  if (!client) {
    throw new Error('useCommerceClient must be used within a CommerceProvider');
  }
  return client;
}
