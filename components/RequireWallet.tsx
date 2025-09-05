import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'expo-router';
import { stripTabsPrefix } from '@/services/navigation';
import { useAppRouter } from '@/services';
import { useAccountId } from '@/features/auth/services/nearAuth';

interface Props {
  children: React.ReactNode;
}

export default function RequireWallet({ children }: Props) {
  const accountId = useAccountId();
  const pathname = usePathname();
  const params = useSearchParams();
  const { replace } = useAppRouter();

  useEffect(() => {
    if (!accountId) {
      let dest = stripTabsPrefix(pathname) ?? pathname;
      const query = params.toString();
      if (query) dest += `?${query}`;
      replace(`/login?redirect=${encodeURIComponent(dest)}`); // eslint-disable-line no-restricted-syntax
    }
  }, [accountId, pathname, params]);

  if (!accountId) return null;
  return <>{children}</>;
}
