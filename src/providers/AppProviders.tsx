import React from 'react';
import { WalletProvider } from './WalletProvider';
import { WakuProvider } from '@/contexts/WakuContext';
import { QueryClient } from '@tanstack/react-query';
import { CheckedQueryClientProvider } from './CheckedQueryClientProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';
import useToast from '@/shared/useToast';
import { ThemeProvider, LanguageProvider } from '../ui/ThemeProvider';
import { AppInfoProvider } from '@/contexts/AppInfoContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthModalProvider } from '@/features/auth/AuthModalContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/components/NotificationContext';

declare global {
  // React Native fast refresh re-evaluates modules; store the client globally to avoid recreation.
  // eslint-disable-next-line no-var
  var __queryClient: QueryClient | undefined;
}

export const queryClient =
  globalThis.__queryClient ?? (globalThis.__queryClient = new QueryClient());

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
  const toast = useToast();
  return (
    <AppInfoProvider>
      <ConfigProvider>
        <ErrorBoundary onError={(e) => toast.showError(e.message)}>
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
