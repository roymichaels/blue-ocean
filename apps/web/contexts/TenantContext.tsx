import React from 'react';
import { stripTabsPrefix } from '@/services/navigation';

export function useTenant() {
  if (typeof window !== 'undefined') {
    const hostParts = window.location.hostname.split('.');
    let tenantId: string | null = null;

    if (hostParts.length > 0) {
      const sub = hostParts[0];
      if (sub && sub !== 'www' && sub !== 'localhost') {
        tenantId = decodeURIComponent(sub);
      }
    }

    if (!tenantId) {
      const path = stripTabsPrefix(window.location.pathname) ?? window.location.pathname;
      const m = path.match(/^\/store\/([^/]+)/);
      tenantId = m ? decodeURIComponent(m[1]) : null;
    }

    return { tenantId, isNetwork: !tenantId } as const;
  }
  return { tenantId: null, isNetwork: true } as const;
}

export default useTenant;

