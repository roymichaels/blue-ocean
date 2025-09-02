import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppInfoProvider } from '@/contexts/AppInfoContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthModalProvider } from '@/features/auth/AuthModalContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/components/NotificationContext';
import { WakuProvider } from '@/contexts/WakuContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppProviders from './providers/AppProviders';
import { Router, usePathname, useRouter, useSegments } from 'expo-router';

export default function App() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    if (!__DEV__) return;

    const path = (router as any).getPath?.() ?? pathname;
    const currentTab = segments[0] ?? '';
    // eslint-disable-next-line no-console
    console.log('[breadcrumb]', path, currentTab);
  }, [router, pathname, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppInfoProvider>
          <LanguageProvider>
            <ThemeProvider>
              <ConfigProvider>
                <AuthProvider>
                  <AuthModalProvider>
                    <CurrencyProvider>
                      <WakuProvider>
                        <NotificationProvider>
                          <ErrorBoundary>
                            <QueryClientProvider client={queryClient}>
                              <React.Suspense fallback={null}>
                                <Router />
                              </React.Suspense>
                            </QueryClientProvider>
                          </ErrorBoundary>
                        </NotificationProvider>
                      </WakuProvider>
                    </CurrencyProvider>
                  </AuthModalProvider>
                </AuthProvider>
              </ConfigProvider>
            </ThemeProvider>
          </LanguageProvider>
        </AppInfoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
