import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppProviders from './providers/AppProviders';
import { Router } from 'expo-router';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <React.Suspense fallback={null}>
            <Router />
          </React.Suspense>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
