import React from 'react';

export function useTenant() {
  if (typeof window !== 'undefined') {
    const m = window.location.pathname.match(/^\/store\/([^/]+)/);
    if (!m) throw new Error('storeId missing');
    return { storeId: decodeURIComponent(m[1]) } as const;
  }
  return { storeId: '' } as const;
}

export default useTenant;

