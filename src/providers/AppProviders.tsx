import React from 'react';
import { WalletProvider } from './WalletProvider';
import { WakuProvider } from '@/contexts/WakuContext';
import { CheckedQueryClientProvider } from './CheckedQueryClientProvider';
import { queryClient } from '@/providers/queryClient';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { useNotificationActions } from '@/components/NotificationContext';
import { ThemeProvider, LanguageProvider } from '../ui/ThemeProvider';
import { AppInfoProvider } from '@/contexts/AppInfoContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthModalProvider } from '@/features/auth/AuthModalContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/components/NotificationContext';
import { reportError } from '@/services/errorReporter';
import { LaunchGateProvider } from '@/features/launchGate';
import { composeProviders, type ProviderConfig } from './composeProviders';

/**
 * Composes the core providers used across the app.
 *
 * Provider order is important:
 * 1. `ThemeProvider` – applies theming before any UI renders.
 * 2. `LanguageProvider` – sets up i18n and text direction.
 * 3. `CheckedQueryClientProvider` – enforces a single React Query client.
 * 4. `WalletProvider` – supplies wallet context for network layers.
 * 5. `AppInfoProvider` – supplies branding and app configuration.
 * 6. `ConfigProvider` – exposes static runtime configuration.
 * 7. `ErrorBoundary` – captures errors from all descendants.
 * 8. `WakuProvider` – depends on the wallet and query client.
 * 9. `AuthProvider` – manages authentication state.
 * 10. `AuthModalProvider` – handles auth modal display.
 * 11. `CurrencyProvider` – stores selected currency.
 * 12. `NotificationProvider` – listens for notifications and displays popups.
 */
type ShowNotification = ReturnType<typeof useNotificationActions>['showNotification'];

interface NotificationRegistrarProps {
  onReady: (showNotification: ShowNotification | null) => void;
}

function NotificationActionsRegistrar({ onReady }: NotificationRegistrarProps) {
  const { showNotification } = useNotificationActions();

  React.useEffect(() => {
    onReady(showNotification);
    return () => onReady(null);
  }, [onReady, showNotification]);

  return null;
}

export default function AppProviders({ children }: React.PropsWithChildren) {
  const [showNotification, setShowNotification] = React.useState<
    ShowNotification | null
  >(null);

  const handleNotificationReady = React.useCallback(
    (notification: ShowNotification | null) => {
      // Defer binding the error handler until the NotificationProvider has
      // mounted so the boundary always uses a live `showNotification` ref.
      setShowNotification(() => notification);
    },
    [],
  );

  const handleBoundaryError = React.useCallback(
    (error: Error, info: React.ErrorInfo) => {
      showNotification?.('Error', error.message, 'error');
      void reportError(error, {
        context: 'error-boundary',
        componentStack: info?.componentStack,
      });
    },
    [showNotification],
  );
  const providerTree = React.useMemo<ProviderConfig[]>(
    () => [
      { component: ThemeProvider },
      { component: LanguageProvider },
      { component: CheckedQueryClientProvider, props: { client: queryClient } },
      { component: WalletProvider },
      { component: AppInfoProvider },
      { component: ConfigProvider },
      { component: ErrorBoundary, props: { onError: handleBoundaryError } },
      { component: WakuProvider },
      { component: AuthProvider },
      { component: AuthModalProvider },
      { component: CurrencyProvider },
      { component: NotificationProvider },
    ],
    [handleBoundaryError],
  );

  return composeProviders(providerTree, (
    <>
      <NotificationActionsRegistrar onReady={handleNotificationReady} />
      <LaunchGateProvider>{children}</LaunchGateProvider>
    </>
  ));
}
