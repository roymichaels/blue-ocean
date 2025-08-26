import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'expo-router';
import { loadTenantSettings } from '../constants/tenant';

interface TenantContextType {
  storeId: string | null;
  setStoreId: (id: string | null) => void;
}

const TenantContext = createContext<TenantContextType>({
  storeId: null,
  setStoreId: () => {},
});

export const useTenant = () => useContext(TenantContext);

interface Props {
  children: React.ReactNode;
}

export function TenantProvider({ children }: Props) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const match = pathname.match(/^\/store\/([^\/]+)/);
    setStoreId(match ? match[1] : null);
  }, [pathname]);

  useEffect(() => {
    loadTenantSettings();
  }, [storeId]);

  return (
    <TenantContext.Provider value={{ storeId, setStoreId }}>
      {children}
    </TenantContext.Provider>
  );
}

