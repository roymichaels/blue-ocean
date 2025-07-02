import 'react-native-crypto';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AdminNotificationBanner from '../components/AdminNotificationBanner';
import { NotificationProvider } from '../components/NotificationContext';
import ChatWidget from '../components/ChatWidget';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { CurrencyProvider } from '../contexts/CurrencyContext';
import AgeVerificationModal from '../components/AgeVerificationModal';
import CartModal from '../components/CartModal';
import { View, ActivityIndicator } from 'react-native';

function AppContent() {
  const [showCartModal, setShowCartModal] = useState(false);
  const { colors, theme } = useTheme();
  const { isAdmin, loading } = useAuth();

  // Show loading screen while initializing
  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: colors.background, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
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
        <Stack.Screen name="reviews/index" options={{ title: 'Reviews' }} />
        <Stack.Screen name="admin" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="kyc/index" options={{ title: 'KYC Verification' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <ChatWidget />
      <CartModal 
        visible={showCartModal} 
        onClose={() => setShowCartModal(false)} 
      />
      <StatusBar style={theme === 'dark' ? "light" : "dark"} backgroundColor={colors.background} />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
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
  );
}