import React, { useMemo } from 'react';
import { View, Pressable, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';
import { Slot, usePathname } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { FloatingCartWidget } from '@/features/cart';
import { useAppRouter } from '@/services';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { spacing, typography } from '@/shared/ui/tokens';

const BASE_NAV_ITEMS = [
  { href: '/', title: 'navigation.home', icon: 'Home' },
] as const;

const SIDEBAR_WIDTH = 80;
const LARGE_SCREEN = 768;

export default function RootLayout() {
  const { t } = useLanguage();
  const { theme, colors } = useTheme();
  const { push } = useAppRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
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

  const NavBar = (
    <View
      style={
        isLargeScreen
          ? {
              width: SIDEBAR_WIDTH,
              backgroundColor: colors.tabBar.background,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }
          : {
              flexDirection: 'row',
              backgroundColor: colors.tabBar.background,
              paddingBottom: insets.bottom,
              height: spacing.spacer24 * 3,
            }
      }
    >
      {navItems.map((item) => {
        const Icon = (Lucide as any)[item.icon] as React.ComponentType<{ size: number; color: string }>;
        const focused = pathname === item.href;
        const color = focused ? colors.tabBar.active : colors.tabBar.inactive;
        return (
          <Pressable
            key={item.href}
            onPress={() => push(item.href)}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flex: isLargeScreen ? undefined : 1,
              paddingVertical: spacing.spacer16,
            }}
          >
            {Icon && <Icon size={24} color={color} />}
            <Text
              style={{
                color,
                fontSize: typography.xs.fontSize,
                fontWeight: '500',
                marginTop: spacing.spacer4,
              }}
            >
              {t(item.title)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.canvas} />
        <GlobalHeader showSearch={showSearch} />
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {isLargeScreen && NavBar}
          <View style={{ flex: 1 }}>
            <Slot />
          </View>
        </View>
        {!isLargeScreen && NavBar}
        {showCartWidget && <FloatingCartWidget />}
      </SafeAreaView>
    </ErrorBoundary>
  );
}

