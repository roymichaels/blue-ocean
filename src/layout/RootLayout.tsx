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
import SidebarTabBar from '@/components/SidebarTabBar';

const BASE_NAV_ITEMS = [
  { href: '/', title: 'navigation.home', icon: 'Home' },
] as const;

const LARGE_SCREEN = 768;

export default function RootLayout() {
  const { theme, colors } = useTheme();
  const { isRTL } = useLanguage();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= LARGE_SCREEN;
  const showSearch = pathname === '/' || pathname === '/index';
  const showCartWidget = showSearch;

  const navItems = useMemo(() => {
    if (pathname.startsWith('/store/')) {
      return [
        ...BASE_NAV_ITEMS,
        { href: pathname, title: 'navigation.store', icon: 'Store' as const },
      ];
    }
    return BASE_NAV_ITEMS;
  }, [pathname]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.canvas} />
        <GlobalHeader showSearch={showSearch} />
        <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
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

