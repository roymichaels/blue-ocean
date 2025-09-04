import React from 'react';
import { WalletProvider } from './WalletProvider';
import { WakuProvider } from '@/contexts/WakuContext';
import { QueryClient } from '@tanstack/react-query';
import { CheckedQueryClientProvider } from './CheckedQueryClientProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function AppProviders({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <WalletProvider>
        <CheckedQueryClientProvider client={queryClient}>
          <WakuProvider>{children}</WakuProvider>
        </CheckedQueryClientProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}
