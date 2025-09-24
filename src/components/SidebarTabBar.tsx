import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, Platform, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/hooks';
import { spacing, typography, radius } from '@/shared/ui/tokens';

export interface NavItem {
  href: string;
  title: string;
  icon: string;
  badge?: number;
  onPress?: () => void;
}

const SIDEBAR_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 80;

interface SidebarTabBarProps {
  items: readonly NavItem[];
  isSidebar?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const SidebarTabBar: React.FC<SidebarTabBarProps> = ({ items, isSidebar, style }) => {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { push } = useAppRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [collapsed, setCollapsed] = useState(false);
  const itemRefs = useRef<Array<React.ComponentRef<typeof Pressable> | null>>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= items.length) {
        const el = itemRefs.current[n - 1] as any;
        el?.focus?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items]);

  // Choose a readable inactive color for dark canvases
  const inactiveColor = (colors as any)?.tabBar?.inactive || colors.text.secondary;

  const MOBILE_BAR_HEIGHT = 72;

  return (
    <View
      style={[
        isSidebar
          ? {
              width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
              backgroundColor: colors.tabBar.background,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              justifyContent: 'space-between',
            }
          : {
              backgroundColor: colors.tabBar.background,
              paddingBottom: insets.bottom,
              height: MOBILE_BAR_HEIGHT,
              alignItems: 'center',
              overflow: 'hidden',
            },
        style,
      ]}
    >
      <View
        style={[
          isSidebar
            ? { flexDirection: 'column' }
            : {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-around',
                width: '100%',
                height: MOBILE_BAR_HEIGHT,
              },
        ]}
      >
        {items.map((item, index) => {
          const Icon = (Lucide as any)[item.icon] as React.ComponentType<{ size: number; color: string }>;
          const focused = pathname === item.href;
          const color = focused ? colors.gold : inactiveColor || colors.text.secondary;
          return (
            <Pressable
              key={item.href}
              ref={(el) => (itemRefs.current[index] = el)}
              onPress={() => (typeof item.onPress === 'function' ? item.onPress() : push(item.href))}
              accessibilityLabel={t(item.title)}
              accessibilityRole="button"
              focusable
              {...(Platform.OS === 'web' && collapsed ? { title: t(item.title) } : {})}
              style={(state) => [
                {
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  flex: isSidebar ? undefined : 1,
                  flexBasis: isSidebar ? undefined : 0,
                  minWidth: isSidebar ? undefined : 0,
                  paddingVertical: spacing.spacer16,
                  paddingHorizontal: isSidebar && !collapsed ? spacing.spacer8 : 0,
                  position: 'relative',
                  flexDirection: isSidebar && !collapsed ? 'row' : 'column',
                },
                isSidebar && focused && { backgroundColor: colors.surface.primary },
                (state as any).focused && {
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
                    backgroundColor: colors.gold,
                  }}
                />
              )}
              {Icon && <Icon size={24} color={color} />}
              {!isSidebar || !collapsed ? (
                <Text
                  style={{
                    color,
                    fontSize: typography.xs.fontSize,
                    fontWeight: '500',
                    marginLeft: isSidebar && !collapsed ? spacing.spacer8 : 0,
                    marginTop: !isSidebar ? spacing.spacer4 : 0,
                  }}
                  numberOfLines={1}
                >
                  {t(item.title)}
                </Text>
              ) : null}
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
      {isSidebar && (
        <Pressable
          onPress={() => setCollapsed((c) => !c)}
          accessibilityLabel={collapsed ? t('navigation.expand') : t('navigation.collapse')}
          accessibilityRole="button"
          {...(Platform.OS === 'web' ? { title: collapsed ? t('navigation.expand') : t('navigation.collapse') } : {})}
          style={{ alignItems: 'center', paddingVertical: spacing.spacer16 }}
        >
          {collapsed ? (
            <Lucide.ChevronRight size={24} color={colors.tabBar.inactive} />
          ) : (
            <Lucide.ChevronLeft size={24} color={colors.tabBar.inactive} />
          )}
        </Pressable>
      )}
    </View>
  );
};

export default SidebarTabBar;

