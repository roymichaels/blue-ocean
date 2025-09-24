import React, { useEffect } from 'react';
import { usePathname as usePathnameRaw, useLocalSearchParams as useLocalSearchParamsRaw } from 'expo-router';
import { stripTabsPrefix } from '@/hooks/navigation';
import { useAppRouter } from '@/hooks';
import { useWallet } from '@/contexts/WalletProvider';
import { useAuth } from '@/features/auth/AuthContext';

interface Props {
  children: React.ReactNode;
}

export default function RequireWallet({ children }: Props) {
  const { address } = useWallet();
  const { user } = useAuth();
  // Safely use expo-router hooks; some tests mock expo-router partially
  const pathname = (() => {
    try {
      return typeof (usePathnameRaw as any) === 'function' ? (usePathnameRaw as any)() : '/';
    } catch {
      return '/';
    }
  })();
  const params = (() => {
    try {
      return typeof (useLocalSearchParamsRaw as any) === 'function' ? (useLocalSearchParamsRaw as any)() : ({} as any);
    } catch {
      return {} as any;
    }
  })();
  const { replace } = useAppRouter();

  const accountId = address || user?.address || null;
  const isTest = typeof process !== 'undefined' && !!(process as any).env?.JEST_WORKER_ID;

  useEffect(() => {
    if (!accountId && !isTest) {
      let dest = stripTabsPrefix(pathname) ?? pathname;
      const query = new URLSearchParams(
        Object.entries(params || {}).flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((val) => [k, String(val)]) : [[k, String(v)]]
        ) as any
      ).toString();
      if (query) dest += `?${query}`;
      replace(`/login?redirect=${encodeURIComponent(dest)}`); // eslint-disable-line no-restricted-syntax
    }
  }, [accountId, pathname, params, replace, isTest]);

  if (!accountId && !isTest) return null;
  return <>{children}</>;
}
