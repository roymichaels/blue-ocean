import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WalletProvider } from './WalletProvider';
import { WakuProvider } from '@/contexts/WakuContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface Props {
  children: React.ReactNode;
}

export default function AppProviders({ children }: Props) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <WalletProvider>
        <QueryClientProvider client={queryClient}>
          <WakuProvider>{children}</WakuProvider>
        </QueryClientProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
