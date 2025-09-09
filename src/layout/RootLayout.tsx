import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Slot, usePathname } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { FloatingCartWidget } from '@/features/cart';
import { useTheme } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';
import SidebarTabBar from '@/components/SidebarTabBar';

const NAV_ITEMS = [
  { href: '/', title: 'navigation.home', icon: 'Home' },
  { href: '/stores', title: 'navigation.stores', icon: 'Store' },
  { href: '/cart', title: 'navigation.cart', icon: 'ShoppingCart' },
  { href: '/orders', title: 'navigation.orders', icon: 'Package' },
  { href: '/profile', title: 'navigation.profile', icon: 'User' },
] as const;

const LARGE_SCREEN = 768;

export default function RootLayout() {
  const { theme, colors } = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= LARGE_SCREEN;
  const showSearch = pathname === '/' || pathname === '/index';
  const showCartWidget = showSearch;

  const navItems = useMemo(() => NAV_ITEMS, []);

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.canvas} />
        <GlobalHeader showSearch={showSearch} />
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {isLargeScreen && <SidebarTabBar items={navItems} isSidebar />}
          <View style={{ flex: 1 }}>
            <Slot />
          </View>
        </View>
        {!isLargeScreen && <SidebarTabBar items={navItems} />}
        {showCartWidget && <FloatingCartWidget />}
      </SafeAreaView>
    </ErrorBoundary>
  );
}

