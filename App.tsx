import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { ExpoRoot } from 'expo-router';
import { ctx } from 'expo-router/_ctx';
import { useLanguage } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui';
import AppProviders from '@/providers/AppProviders';

const USE_ROUTER = (process.env.EXPO_PUBLIC_USE_ROUTER ?? '1') === '1';

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
