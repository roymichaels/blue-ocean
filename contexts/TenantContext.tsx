import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'expo-router';
import { stripTabsPrefix } from '@/services/navigation';
import { loadTenantSettings } from '@/constants/tenant';

interface TenantContextType {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  setTenantId: () => {},
});

export function useTenant() {
  const { tenantId } = useContext(TenantContext);
  return { tenantId, isNetwork: !tenantId } as const;
}

interface Props {
  children: React.ReactNode;
}

export function TenantProvider({ children }: Props) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let id: string | null = null;

    if (typeof window !== 'undefined') {
      const host = window.location.hostname.split('.');
      if (host.length > 0) {
        const sub = host[0];
        if (sub && sub !== 'www' && sub !== 'localhost') {
          id = decodeURIComponent(sub);
        }
      }
    }

    if (!id) {
      const path = stripTabsPrefix(pathname) ?? pathname;
      const match = path.match(/^\/store\/([^\/]+)/);
      id = match ? decodeURIComponent(match[1]) : null;
    }

    setTenantId(id);
  }, [pathname]);

  useEffect(() => {
    loadTenantSettings();
  }, [tenantId]);

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

