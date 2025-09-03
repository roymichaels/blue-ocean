import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'expo-router';
import { replace } from '@/services/navigation';
import { useAccountId } from '@/features/auth/services/nearAuth';

interface Props {
  children: React.ReactNode;
}

export default function RequireWallet({ children }: Props) {
  const accountId = useAccountId();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!accountId) {
      let dest = pathname;
      const query = params.toString();
      if (query) dest += `?${query}`;
      replace(`/login?redirect=${encodeURIComponent(dest)}`); // eslint-disable-line no-restricted-syntax
    }
  }, [accountId, pathname, params]);

  if (!accountId) return null;
  return <>{children}</>;
}
