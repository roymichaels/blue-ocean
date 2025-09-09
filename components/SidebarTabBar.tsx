import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import { spacing, typography } from '@/shared/ui/tokens';

export interface NavItem {
  href: string;
  title: string;
  icon: string;
}

const SIDEBAR_WIDTH = 80;

interface SidebarTabBarProps {
  items: readonly NavItem[];
  isSidebar?: boolean;
}

export const SidebarTabBar: React.FC<SidebarTabBarProps> = ({ items, isSidebar }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { push } = useAppRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

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
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flex: isSidebar ? undefined : 1,
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
};

export default SidebarTabBar;

