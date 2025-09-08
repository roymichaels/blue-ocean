import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getTabsForAuth } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing, typography } from '@/shared/ui/tokens';

const SIDEBAR_WIDTH = 80;

export default function SidebarTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const tabs = React.useMemo(() => getTabsForAuth(auth), [auth]);

  return (
    <View
      style={{
        width: SIDEBAR_WIDTH,
        backgroundColor: colors.tabBar.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {tabs.map((tab) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const focused = state.index === routeIndex;
        const Icon = (Lucide as any)[tab.icon] as React.ComponentType<{ size: number; color: string }>;
        const color = focused ? colors.tabBar.active : colors.tabBar.inactive;
        const label = mapTitle(t, tab.title);

        return (
          <Pressable
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={{
              alignItems: 'center',
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
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function mapTitle(t: (key: string) => string, raw: string) {
  const map: Record<string, string> = {
    Home: t('navigation.home'),
    Stores: t('navigation.stores'),
    Cart: t('navigation.cart'),
    Orders: t('navigation.orders'),
    Profile: t('navigation.profile'),
    Categories: t('navigation.categories'),
    Notifications: t('navigation.notifications'),
    Reviews: t('navigation.reviews'),
  };
  return map[raw] ?? raw;
}

export { SIDEBAR_WIDTH };
