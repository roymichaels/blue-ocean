// app/_layout.tsx

// normal imports:
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import commonStyles from '../constants/styles';

import AdminNotificationBanner from '../components/AdminNotificationBanner';
import { NotificationProvider } from '../components/NotificationContext';
import { AuthProvider, useAuth } from '../components/AuthContext';
import {
  AuthModalProvider,
  useAuthModal,
} from '../components/AuthModalContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { CurrencyProvider } from '../contexts/CurrencyContext';
import { AppInfoProvider } from '../contexts/AppInfoContext';
import AgeVerificationModal from '../components/AgeVerificationModal';
import CartModal from '../components/CartModal';
import ChatWidget from '../components/ChatWidget';
import { ConfigProvider } from '../contexts/ConfigContext';
import { loadTenantSettings } from '../constants/tenant';
import { initConfig } from '../utils/appConfig';
import OnboardingScreen from './onboarding';
import {
  OnboardingProvider,
  useOnboarding,
} from '../contexts/OnboardingContext';

function AppContent() {
  const [showCartModal, setShowCartModal] = useState(false);
  const { colors, theme } = useTheme();
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={commonStyles.flex1}>
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

  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initConfig();
      await loadTenantSettings();
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        #ton-connect-ui-container {
          z-index: 9999 !important;
          position: fixed !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const manifestUrl =
    Platform.OS === 'web'
      ? typeof window !== 'undefined'
        ? new URL('/tonconnect-manifest.json', window.location.origin).href
        : '/tonconnect-manifest.json'
      : 'https://blue-ocean.vercel.app/tonconnect-manifest.json';

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <ConfigProvider>
        <AuthProvider>
          <OnboardingProvider>
            <AuthModalProvider>
              <RootLayoutInner />
            </AuthModalProvider>
          </OnboardingProvider>
        </AuthProvider>
      </ConfigProvider>
    </TonConnectUIProvider>
  );
}

function RootLayoutInner() {
  const { onboarded } = useOnboarding();
  const { isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthModal();
  const pathname = usePathname();
  useEffect(() => {
    if (onboarded === false && !isLoggedIn) {
      openAuthModal('signup');
      if (pathname !== '/') {
        router.replace('/');
      }
    }
  }, [onboarded, isLoggedIn, pathname, openAuthModal]);

  if (onboarded === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!onboarded) {
    return <OnboardingScreen />;
  }

  return (
    <AppInfoProvider>
      <ThemeProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AppInfoProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
