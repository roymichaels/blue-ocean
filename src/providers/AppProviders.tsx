import React from 'react';
import { WalletProvider } from './WalletProvider';
import { WakuProvider } from '@/contexts/WakuContext';
import { QueryClient } from '@tanstack/react-query';
import { CheckedQueryClientProvider } from './CheckedQueryClientProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { ThemeProvider, LanguageProvider } from '../ui/ThemeProvider';

/**
 * Composes the core providers used across the app.
 *
 * Provider order is important:
 * 1. `ErrorBoundary` – captures errors from all descendants.
 * 2. `ThemeProvider` – applies theming before any UI renders.
 * 3. `LanguageProvider` – sets up i18n and text direction.
 * 4. `WalletProvider` – supplies wallet context for network layers.
 * 5. `CheckedQueryClientProvider` – enforces a single React Query client.
 * 6. `WakuProvider` – depends on the wallet and query client.
 */
export default function AppProviders({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <WalletProvider>
            <CheckedQueryClientProvider client={queryClient}>
              <WakuProvider>{children}</WakuProvider>
            </CheckedQueryClientProvider>
          </WalletProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
