import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { ExpoRoot } from 'expo-router';
import { ctx } from './router-ctx.web';
import { useLanguage } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui';
import AppProviders from '@/providers/AppProviders';
import { isRouterEnabled } from '@/hooks/config';
import { initSessionTokens } from '@/services/session';
import { initErrorReporter } from '@/services/errorReporter';
import { errorLog, setDebugLogsEnabled } from '@/utils/logger';
import {
  ensureAdminAgentSubscription,
  stopAdminAgentSubscription,
} from '@/hooks/adminSubscription';

const USE_ROUTER = isRouterEnabled();
const FALLBACK_STYLE = { flex: 1, alignItems: 'center', justifyContent: 'center' };

export default function App() {
  const { t } = useLanguage();

  useEffect(() => {
    void initSessionTokens();

    setDebugLogsEnabled(true);
    const cleanupReporter = initErrorReporter({
      tags: {
        release: process.env.EXPO_PUBLIC_APP_REVISION || 'dev',
      },
      extras: {
        nodeEnv: process.env.NODE_ENV,
      },
    });

    void ensureAdminAgentSubscription().catch((err) => {
      errorLog('Failed to initialize admin agent subscription', err);
    });

    return () => {
      stopAdminAgentSubscription();
      cleanupReporter();
    };
  }, []);

  const screen = USE_ROUTER ? (
    <ExpoRoot context={ctx} />
  ) : (
    <View style={FALLBACK_STYLE}>
      <Text>{t('app.routerDisabled')}</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <React.Suspense fallback={<Spinner />}>
          <AppProviders>{screen}</AppProviders>
        </React.Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
