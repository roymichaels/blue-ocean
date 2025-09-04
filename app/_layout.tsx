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
import { AppProviders, ThemeProvider, LanguageProvider } from '@/providers';
import { View } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui/primitives';

export default function RootLayout() {
  const { colors } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppInfoProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AppProviders>
                <ConfigProvider>
                  <AuthProvider>
                    <AuthModalProvider>
                      <CurrencyProvider>
                        <NotificationProvider>
                          <React.Suspense
                            fallback={
                              <View
                                style={{
                                  flex: 1,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  backgroundColor: colors.background,
                                }}
                              >
                                <Spinner color={colors.gold} />
                              </View>
                            }
                          >
                            <Slot />
                          </React.Suspense>
                        </NotificationProvider>
                      </CurrencyProvider>
                    </AuthModalProvider>
                  </AuthProvider>
                </ConfigProvider>
              </AppProviders>
            </LanguageProvider>
          </ThemeProvider>
        </AppInfoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
