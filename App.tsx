import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { ExpoRoot } from 'expo-router';
import { ctx } from './router-ctx.web';
import { useLanguage } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui';
import AppProviders from '@/providers/AppProviders';
import { isRouterEnabled } from '@/services/config';
import { initSessionTokens } from '@/services/session';
import { initErrorReporter } from '@/services/errorReporter';
import { setDebugLogsEnabled } from '@/utils/logger';

const USE_ROUTER = isRouterEnabled();

function RouterApp() {
  return <ExpoRoot context={ctx} />;
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
  useEffect(() => {
    void initSessionTokens();
  }, []);
  useEffect(() => {
    setDebugLogsEnabled(true);
    const cleanupReporter = initErrorReporter({
      tags: {
        release: process.env.EXPO_PUBLIC_APP_REVISION || 'dev',
      },
      extras: {
        nodeEnv: process.env.NODE_ENV,
      },
    });
    return cleanupReporter;
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <React.Suspense fallback={<Spinner />}>
          <AppProviders>
            {USE_ROUTER ? <RouterApp /> : <FallbackScreen />}
          </AppProviders>
        </React.Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return <MainApp />;
}
