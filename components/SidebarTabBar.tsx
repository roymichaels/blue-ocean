import React, { useEffect } from 'react';
import { View, Pressable, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import { spacing, typography, radius } from '@/shared/ui/tokens';

export interface NavItem {
  href: string;
  title: string;
  icon: string;
  badge?: number;
}

const SIDEBAR_WIDTH = 80;

interface SidebarTabBarProps {
  items: readonly NavItem[];
  isSidebar?: boolean;
}

export const SidebarTabBar: React.FC<SidebarTabBarProps> = ({ items, isSidebar }) => {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { push } = useAppRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= items.length) {
        push(items[n - 1].href);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, push]);

  return (
    <View
      style={
        isSidebar
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
      {items.map((item) => {
        const Icon = (Lucide as any)[item.icon] as React.ComponentType<{ size: number; color: string }>;
        const focused = pathname === item.href;
        const color = focused ? colors.tabBar.active : colors.tabBar.inactive;
        return (
          <Pressable
            key={item.href}
            onPress={() => push(item.href)}
            accessibilityLabel={t(item.title)}
            accessibilityRole="button"
            focusable
            {...(Platform.OS === 'web' ? { title: t(item.title) } : {})}
            style={({ focused: isFocused }) => [
              {
                alignItems: 'center',
                justifyContent: 'center',
                flex: isSidebar ? undefined : 1,
                paddingVertical: spacing.spacer16,
                position: 'relative',
              },
              isSidebar && focused && { backgroundColor: colors.surface.primary },
              isFocused && {
                borderColor: colors.border.focus,
                borderWidth: 2,
                borderRadius: radius.md,
              },
            ]}
          >
            {isSidebar && focused && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  [isRTL ? 'right' : 'left']: 0,
                  width: 4,
                  backgroundColor: colors.tabBar.active,
                }}
              />
            )}
            {Icon && <Icon size={24} color={color} />}
            {!isSidebar && (
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
            )}
            {item.badge && item.badge > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: spacing.spacer4,
                  right: spacing.spacer4,
                  backgroundColor: colors.gold,
                  borderRadius: radius.full,
                  minWidth: spacing.spacer16,
                  height: spacing.spacer16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: spacing.spacer4,
                }}
              >
                <Text
                  style={{
                    color: colors.text.inverse,
                    fontSize: typography.xs.fontSize,
                    fontWeight: 'bold',
                  }}
                >
                  {item.badge}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

export default SidebarTabBar;

