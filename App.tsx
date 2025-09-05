import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Router, usePathname, useSegments } from 'expo-router';
import { stripTabsPrefix } from '@/services/navigation';
import { useLanguage } from '@/ui/ThemeProvider';
import { debugLog } from '@/utils/logger';

const USE_ROUTER = (process.env.EXPO_PUBLIC_USE_ROUTER ?? '1') === '1';

function RouterApp() {
  const pathname = usePathname();
  const segments = useSegments();

  React.useEffect(() => {
    if (!__DEV__) return;

    const path = stripTabsPrefix(pathname) ?? pathname;
    const currentTab = segments[0] ?? '';
    debugLog(`[breadcrumb] ${path} ${currentTab}`);
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
        <React.Suspense fallback={null}>
          {USE_ROUTER ? <RouterApp /> : <FallbackScreen />}
        </React.Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return <MainApp />;
}
