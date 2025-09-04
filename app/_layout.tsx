import React from 'react';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppInfoProvider } from '@/contexts/AppInfoContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthModalProvider } from '@/features/auth/AuthModalContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/components/NotificationContext';
import AppProviders from '@/providers';

export default function RootLayout() {
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
                        <Slot />
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
