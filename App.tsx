import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import AppProviders from '@/providers';
import { Router, usePathname, useSegments } from 'expo-router';
import { stripTabsPrefix } from '@/services/navigation';
import { useLanguage } from '@/ui/ThemeProvider';

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
  const { t } = useLanguage();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{t('app.routerDisabled')}</Text>
    </View>
  );
}

function MainApp() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <React.Suspense fallback={null}>
            {USE_ROUTER ? <RouterApp /> : <FallbackScreen />}
          </React.Suspense>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return <MainApp />;
}
