// app/_layout.tsx

// 1) Polyfills for Node globals and web APIs — must come before any React/Expo imports:
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';

if (typeof (global as any).__filename === 'undefined') {
  // some SDKs (e.g. matrix-js-sdk) reference __filename
  (global as any).__filename = '';
}

if (typeof (global as any).Buffer === 'undefined') {
  // ensure Buffer is available
  (global as any).Buffer = Buffer;
}

// 2) Now your normal imports:
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

import AdminNotificationBanner from '../components/AdminNotificationBanner';
import { NotificationProvider } from '../components/NotificationContext';
import ChatWidget from '../components/ChatWidget';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { CurrencyProvider } from '../contexts/CurrencyContext';
import { AppInfoProvider } from '../contexts/AppInfoContext';
import AgeVerificationModal from '../components/AgeVerificationModal';
import CartModal from '../components/CartModal';

function AppContent() {
  const [showCartModal, setShowCartModal] = useState(false);
  const { colors, theme } = useTheme();
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AgeVerificationModal />
      {isAdmin && <AdminNotificationBanner />}

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="subcategory/[id]" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="driver-dashboard" />
        <Stack.Screen name="reviews/index" options={{ title: 'Reviews' }} />
        <Stack.Screen name="admin" />
        <Stack.Screen name="auth" />
        <Stack.Screen
          name="kyc/index"
          options={{ title: 'KYC Verification' }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>

      <ChatWidget />
      <CartModal
        visible={showCartModal}
        onClose={() => setShowCartModal(false)}
      />

      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor={colors.background}
      />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AppInfoProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CurrencyProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </CurrencyProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AppInfoProvider>
  );
}
