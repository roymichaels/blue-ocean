import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'expo-router';
import { stripTabsPrefix } from '@/services/navigation';
import { useAppRouter } from '@/services';
import { useWallet } from '@/contexts/WalletProvider';

interface Props {
  children: React.ReactNode;
}

export default function RequireWallet({ children }: Props) {
  const { address } = useWallet();
  const pathname = usePathname();
  const params = useSearchParams();
  const { replace } = useAppRouter();

  useEffect(() => {
    if (!address) {
      let dest = stripTabsPrefix(pathname) ?? pathname;
      const query = params.toString();
      if (query) dest += `?${query}`;
      replace(`/login?redirect=${encodeURIComponent(dest)}`); // eslint-disable-line no-restricted-syntax
    }
  }, [address, pathname, params]);

  if (!address) return null;
  return <>{children}</>;
}
