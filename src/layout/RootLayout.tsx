import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Slot, usePathname } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { FloatingCartWidget } from '@/features/cart';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';
import SidebarTabBar, { NavItem } from '@/components/SidebarTabBar';
import { useAuth } from '@/features/auth/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { getShopTenantId } from '@/services/config';

interface NavItemConfig extends NavItem {
  requiresAuth?: boolean;
  requiresStoreOwner?: boolean;
  requiresTenant?: boolean;
}

const NAV_ITEMS: readonly NavItemConfig[] = [
  { href: '/', title: 'navigation.home', icon: 'Home' },
  {
    href: `/store/${getShopTenantId()}`,
    title: 'navigation.shopNow',
    icon: 'Store',
  },
  {
    href: '/messages',
    title: 'navigation.messages',
    icon: 'MessageCircle',
    requiresAuth: true,
  },
  {
    href: '/me',
    title: 'navigation.profile',
    icon: 'User',
    requiresAuth: true,
  },
  {
    href: '/store/[storeId]/admin',
    title: 'navigation.dashboard',
    icon: 'LayoutDashboard',
    requiresAuth: true,
    requiresStoreOwner: true,
    requiresTenant: true,
  },
  {
    href: '/settings',
    title: 'navigation.settings',
    icon: 'Settings',
    requiresAuth: true,
  },
] as const;

const LARGE_SCREEN = 768;

export default function RootLayout() {
  const { theme, colors } = useTheme();
  const { isRTL } = useLanguage();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { isLoggedIn, isStoreOwner } = useAuth();
  const { tenantId } = useTenant();
  const isLargeScreen = width >= LARGE_SCREEN;
  const showSearch = pathname === '/' || pathname === '/index';
  const showCartWidget = showSearch;

  const navItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.requiresAuth && !isLoggedIn) return false;
        if (item.requiresStoreOwner && !isStoreOwner) return false;
        if (item.requiresTenant && !tenantId) return false;
        return true;
      }).map((item) => ({
        ...item,
        href: item.href.replace('[storeId]', tenantId ?? ''),
      })),
    [isLoggedIn, isStoreOwner, tenantId],
  );

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.canvas} />
        <GlobalHeader showSearch={showSearch} />
        <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {isLargeScreen && <SidebarTabBar items={navItems} isSidebar />}
          <View style={{ flex: 1 }}>
            <Slot />
            {!isLargeScreen && <SidebarTabBar items={navItems} />}
          </View>
        </View>
        {showCartWidget && <FloatingCartWidget />}
      </SafeAreaView>
    </ErrorBoundary>
  );
}

