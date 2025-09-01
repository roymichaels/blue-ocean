import React from 'react';
import { Redirect, usePathname, useSearchParams } from 'expo-router';
import { useAccountId } from '@/features/auth/services/nearAuth';

interface Props {
  children: React.ReactNode;
}

export default function RequireWallet({ children }: Props) {
  const accountId = useAccountId();
  const pathname = usePathname();
  const params = useSearchParams();

  if (!accountId) {
    let dest = pathname;
    const query = params.toString();
    if (query) dest += `?${query}`;
    return <Redirect href={`/login?redirect=${encodeURIComponent(dest)}`} />;
  }
  return <>{children}</>;
}
