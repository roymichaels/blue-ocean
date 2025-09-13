// Touchpoint: Ensure bottom navigation remains sticky on mobile devices
import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Slot, usePathname } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { FloatingCartWidget } from '@/features/cart';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';
import SidebarTabBar, { NavItem } from '@/components/SidebarTabBar';
import { Portal } from '@/ui/primitives';
import { useAuth } from '@/features/auth/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { getShopTenantId } from '@/services/config';

interface NavItemConfig extends NavItem {
  requiresAuth?: boolean;
  requiresStoreOwner?: boolean;
  requiresTenant?: boolean;
}

const SHOP_TENANT_ID = getShopTenantId();

const NAV_ITEMS: readonly NavItemConfig[] = [
  { href: '/', title: 'navigation.home', icon: 'Home' },
  {
    href: `/store/${SHOP_TENANT_ID}`,
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
const BOTTOM_BAR_HEIGHT = 72; // ~ spacing.spacer24 * 3

export default function RootLayout() {
  const { theme, colors } = useTheme();
  const { isRTL } = useLanguage();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { isLoggedIn, isStoreOwner } = useAuth();
  const { tenantId } = useTenant();
  const insets = useSafeAreaInsets();
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
        <View
          style={{
            flex: 1,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}
        >
          {isLargeScreen && <SidebarTabBar items={navItems} isSidebar />}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.canvas,
              paddingBottom: isLargeScreen ? 0 : BOTTOM_BAR_HEIGHT + insets.bottom,
            }}
          >
            <Slot />
          </View>
        </View>
        {!isLargeScreen && (
          <Portal>
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                height: BOTTOM_BAR_HEIGHT + insets.bottom,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.tabBar.background,
                  borderTopColor: colors.border.primary,
                  borderTopWidth: 1,
                  height: BOTTOM_BAR_HEIGHT + insets.bottom,
                }}
              >
                <SidebarTabBar items={navItems} />
              </View>
            </View>
          </Portal>
        )}
        {showCartWidget && <FloatingCartWidget />}
      </SafeAreaView>
    </ErrorBoundary>
  );
}

// Acceptance: Bottom navigation is mobile-only and content has padding to avoid overlap

