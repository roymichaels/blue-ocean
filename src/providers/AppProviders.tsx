import React from 'react';
import { WalletProvider } from './WalletProvider';
import { WakuProvider } from '@/contexts/WakuContext';
import { QueryClient } from '@tanstack/react-query';
import { CheckedQueryClientProvider } from './CheckedQueryClientProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { ThemeProvider, LanguageProvider } from '../ui/ThemeProvider';
import { AppInfoProvider } from '@/contexts/AppInfoContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthModalProvider } from '@/features/auth/AuthModalContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/components/NotificationContext';

/**
 * Composes the core providers used across the app.
 *
 * Provider order is important:
 * 1. `AppInfoProvider` – supplies branding and app configuration to theming.
 * 2. `ConfigProvider` – exposes static runtime configuration.
 * 3. `ErrorBoundary` – captures errors from all descendants.
 * 4. `ThemeProvider` – applies theming before any UI renders.
 * 5. `LanguageProvider` – sets up i18n and text direction.
 * 6. `WalletProvider` – supplies wallet context for network layers.
 * 7. `CheckedQueryClientProvider` – enforces a single React Query client.
 * 8. `WakuProvider` – depends on the wallet and query client.
 * 9. `AuthProvider` – manages authentication state.
 * 10. `AuthModalProvider` – handles auth modal display.
 * 11. `CurrencyProvider` – stores selected currency.
 * 12. `NotificationProvider` – listens for notifications and displays popups.
 */
export default function AppProviders({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <AppInfoProvider>
      <ConfigProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <LanguageProvider>
              <WalletProvider>
                <CheckedQueryClientProvider client={queryClient}>
                  <WakuProvider>
                    <AuthProvider>
                      <AuthModalProvider>
                        <CurrencyProvider>
                          <NotificationProvider>{children}</NotificationProvider>
                        </CurrencyProvider>
                      </AuthModalProvider>
                    </AuthProvider>
                  </WakuProvider>
                </CheckedQueryClientProvider>
              </WalletProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </ConfigProvider>
    </AppInfoProvider>
  );
}
