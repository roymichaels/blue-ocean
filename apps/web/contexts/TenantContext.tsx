import React from 'react';
import { stripTabsPrefix } from '@/services/navigation';

export function useTenant() {
  if (typeof window !== 'undefined') {
    const path = stripTabsPrefix(window.location.pathname) ?? window.location.pathname;
    const m = path.match(/^\/store\/([^/]+)/);
    if (!m) throw new Error('storeId missing');
    return { storeId: decodeURIComponent(m[1]) } as const;
  }
  return { storeId: '' } as const;
}

export default useTenant;

