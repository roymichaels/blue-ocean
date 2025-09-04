import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { AppInfoProvider } from '@/contexts/AppInfoContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthModalProvider } from '@/features/auth/AuthModalContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/components/NotificationContext';
import AppProviders from '@/providers';
import { Router, usePathname, useSegments } from 'expo-router';
import { stripTabsPrefix } from '@/services/navigation';
import { initI18n } from '@/services/i18n';

const USE_ROUTER = (process.env.EXPO_PUBLIC_USE_ROUTER ?? '1') === '1';

function RouterApp() {
  const pathname = usePathname();
  const segments = useSegments();

  React.useEffect(() => {
    if (!__DEV__) return;

    const path = stripTabsPrefix(pathname) ?? pathname;
    const currentTab = segments[0] ?? '';
    // eslint-disable-next-line no-console
    console.log('[breadcrumb]', path, currentTab);
  }, [pathname, segments]);

  return <Router />;
}

function FallbackScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Router disabled</Text>
    </View>
  );
}

function MainApp() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppInfoProvider>
          <AppProviders>
            <ConfigProvider>
              <AuthProvider>
                <AuthModalProvider>
                  <CurrencyProvider>
                    <NotificationProvider>
                      <React.Suspense fallback={null}>
                        {USE_ROUTER ? <RouterApp /> : <FallbackScreen />}
                      </React.Suspense>
                    </NotificationProvider>
                  </CurrencyProvider>
                </AuthModalProvider>
              </AuthProvider>
            </ConfigProvider>
          </AppProviders>
        </AppInfoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    initI18n('en').finally(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>Loading translations...</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return <MainApp />;
}
