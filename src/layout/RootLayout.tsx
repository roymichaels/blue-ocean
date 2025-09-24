// Touchpoint: Ensure bottom navigation remains sticky on mobile devices
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
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
import { useAuthModal } from '@/features/auth/AuthModalContext';
import { useTenant } from '@/contexts/TenantContext';
import { getShopTenantId } from '@/hooks/config';
import { useLaunchGate } from '@/features/launchGate';
import { useAppRouter } from '@/hooks/useAppRouter';
import { OpsDrawer } from '@/features/opsDrawer';
import { isOpsDrawerEnabled, isDriverChatEnabled } from '@/config/featureFlags';

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
    href: '/orders',
    title: 'navigation.orders',
    icon: 'Receipt',
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
const OPS_GESTURE_WIDTH = 24;

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

  const { openAuthModal } = useAuthModal();
  const { recordActivity, ready: launchReady, pinSet } = useLaunchGate();
  const { replace } = useAppRouter();
  const opsDrawerFeature = isOpsDrawerEnabled();
  const driverChatEnabled = isDriverChatEnabled();
  const [opsDrawerOpen, setOpsDrawerOpen] = useState(false);
  const opsOpenRef = useRef(false);

  useEffect(() => {
    opsOpenRef.current = opsDrawerOpen;
  }, [opsDrawerOpen]);

  useEffect(() => {
    if (!opsDrawerFeature && opsDrawerOpen) {
      opsOpenRef.current = false;
      setOpsDrawerOpen(false);
    }
  }, [opsDrawerFeature, opsDrawerOpen]);

  const openOpsDrawer = useCallback(() => {
    if (opsOpenRef.current) return;
    opsOpenRef.current = true;
    setOpsDrawerOpen(true);
  }, []);

  const closeOpsDrawer = useCallback(() => {
    opsOpenRef.current = false;
    setOpsDrawerOpen(false);
  }, []);

  const opsGestureResponder = useMemo(() => {
    if (!opsDrawerFeature) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const pageX =
          typeof evt.nativeEvent.pageX === 'number'
            ? evt.nativeEvent.pageX
            : evt.nativeEvent.locationX;
        return pageX <= OPS_GESTURE_WIDTH;
      },
      onMoveShouldSetPanResponder: (evt, gesture) => {
        const startX =
          typeof evt.nativeEvent.pageX === 'number'
            ? evt.nativeEvent.pageX
            : evt.nativeEvent.locationX;
        if (startX > OPS_GESTURE_WIDTH) return false;
        if (Math.abs(gesture.dy) > 25) return false;
        return gesture.dx > 12;
      },
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dx > 40) openOpsDrawer();
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx > 40) openOpsDrawer();
      },
      onPanResponderTerminationRequest: () => true,
    });
  }, [opsDrawerFeature, openOpsDrawer]);

  const navItems = useMemo(() => {
    const filtered = driverChatEnabled
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) => item.href !== '/messages');
    const replaced = filtered.map((item) => ({
      ...item,
      href: item.href.replace('[storeId]', tenantId ?? ''),
    }));
    // Do not hide tabs; gate navigation per item instead.
    return replaced.map((item) => {
      const needsAuth = !!item.requiresAuth;
      const needsOwner = !!item.requiresStoreOwner;
      const needsTenant = !!item.requiresTenant;
      const guardedOnPress = () => {
        if ((needsAuth && !isLoggedIn) || (needsOwner && !isStoreOwner)) {
          openAuthModal();
          return;
        }
        if (needsTenant && !tenantId) {
          // Missing tenant context; ignore tap for now
          return;
        }
        // Normal navigation happens in SidebarTabBar when onPress isn't set.
      };
      // Only attach onPress when gating applies and conditions not met
      const shouldIntercept =
        (needsAuth && !isLoggedIn) || (needsOwner && !isStoreOwner) || (needsTenant && !tenantId);
      return shouldIntercept ? ({ ...item, onPress: guardedOnPress } as NavItem) : (item as NavItem);
    });
  }, [driverChatEnabled, isLoggedIn, isStoreOwner, tenantId, openAuthModal]);

  useEffect(() => {
    if (!launchReady) return;
    if (!pinSet && pathname !== '/wallet') {
      replace('/wallet');
      return;
    }
    if (pinSet && pathname === '/wallet') {
      replace('/');
    }
  }, [launchReady, pinSet, pathname, replace]);

  useEffect(() => {
    if (!launchReady) return;
    recordActivity();
  }, [pathname, launchReady, recordActivity]);

  const handleAnyInteraction = useCallback(() => {
    if (!launchReady) return;
    recordActivity();
  }, [launchReady, recordActivity]);

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.canvas }}
        onTouchStart={handleAnyInteraction}
        onStartShouldSetResponder={() => {
          handleAnyInteraction();
          return false;
        }}
      >
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.canvas} />
        <GlobalHeader showSearch={showSearch} />
        <View
          style={{
            flex: 1,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}
          onTouchStart={handleAnyInteraction}
          // @ts-expect-error React Native web supports onMouseDown
          onMouseDown={handleAnyInteraction}
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
                position: Platform.OS === 'web' ? 'fixed' : 'absolute',
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
        {opsDrawerFeature && opsGestureResponder && (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View
              style={styles.opsGestureStrip}
              pointerEvents="auto"
              {...opsGestureResponder.panHandlers}
            />
          </View>
        )}
        {opsDrawerFeature && (
          <OpsDrawer open={opsDrawerOpen} onClose={closeOpsDrawer} />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  opsGestureStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: OPS_GESTURE_WIDTH,
  },
});

// Acceptance: Bottom navigation is mobile-only and content has padding to avoid overlap

