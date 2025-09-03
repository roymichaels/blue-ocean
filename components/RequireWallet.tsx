import React, { useEffect } from 'react';
import { usePathname, useSearchParams, useRouter } from 'expo-router';
import { useAccountId } from '@/features/auth/services/nearAuth';

interface Props {
  children: React.ReactNode;
}

export default function RequireWallet({ children }: Props) {
  const accountId = useAccountId();
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!accountId) {
      let dest = pathname;
      const query = params.toString();
      if (query) dest += `?${query}`;
      router.replace(`/login?redirect=${encodeURIComponent(dest)}`); // eslint-disable-line no-restricted-syntax
    }
  }, [accountId, pathname, params, router]);

  if (!accountId) return null;
  return <>{children}</>;
}
