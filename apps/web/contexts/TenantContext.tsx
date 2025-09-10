import React from 'react';
import { stripTabsPrefix } from '@/services/navigation';

export function useTenant() {
  if (typeof window !== 'undefined') {
    const hostParts = window.location.hostname.split('.');
    if (hostParts.length > 0) {
      const sub = hostParts[0];
      if (sub && sub !== 'www' && sub !== 'localhost') {
        return { tenantId: decodeURIComponent(sub), isNetwork: false } as const;
      }
    }

    const path = stripTabsPrefix(window.location.pathname) ?? window.location.pathname;
    const m = path.match(/^\/store\/([^/]+)/);
    if (m) {
      return { tenantId: decodeURIComponent(m[1]), isNetwork: false } as const;
    }
    return { tenantId: null, isNetwork: true } as const;
  }
  return { tenantId: null, isNetwork: true } as const;
}

export default useTenant;

