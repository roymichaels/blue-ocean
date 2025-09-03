import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { AppInfoProvider } from '@/contexts/AppInfoContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { AuthProvider } from '@features/auth/AuthContext';
import { AuthModalProvider } from '@features/auth/AuthModalContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/components/NotificationContext';
import { WakuProvider } from '@/contexts/WakuContext';
import ErrorBoundary from '@shared/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, usePathname, useRouter, useSegments } from 'expo-router';

const USE_ROUTER = (process.env.EXPO_PUBLIC_USE_ROUTER ?? '1') === '1';
const queryClient = new QueryClient();

function RouterApp() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  React.useEffect(() => {
    if (!__DEV__) return;

    const path = (router as any).getPath?.() ?? pathname;
    const currentTab = segments[0] ?? '';
    // eslint-disable-next-line no-console
    console.log('[breadcrumb]', path, currentTab);
  }, [router, pathname, segments]);

  return <Router />;
}

function FallbackScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Router disabled</Text>
    </View>
  );
}

export default function App() {
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
                                {USE_ROUTER ? <RouterApp /> : <FallbackScreen />}
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
