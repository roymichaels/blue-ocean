import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WalletProvider } from './WalletProvider';
import { WakuProvider } from '@/contexts/WakuContext';
import { QueryClient } from '@tanstack/react-query';
import { CheckedQueryClientProvider } from './CheckedQueryClientProvider';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';

export default function AppProviders({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <WalletProvider>
          <CheckedQueryClientProvider client={queryClient}>
            <WakuProvider>{children}</WakuProvider>
          </CheckedQueryClientProvider>
        </WalletProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}
