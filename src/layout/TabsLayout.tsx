import { Tabs } from 'expo-router';
import * as Lucide from 'lucide-react-native';
import { useLanguage } from '@/ui/ThemeProvider';
import { useTheme } from '@/ui/ThemeProvider';
import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'expo-router';
import { Platform } from 'react-native';
import { FloatingCartWidget } from '@/features/cart';
import { getTabsForAuth } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { spacing, shadows } from '@/shared/ui/tokens';

export default function TabsLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const auth = useAuth();
  const pathname = usePathname();
  const [showCartWidget, setShowCartWidget] = useState(false);
  const tabs = useMemo(() => getTabsForAuth(auth), [auth]);

  useEffect(() => {
    setShowCartWidget(pathname === '/' || pathname === '/index');
  }, [pathname]);

  const tabBarStyle = {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.tabBar.background,
    height: spacing.spacer24 * 3,
    paddingBottom: spacing.spacer8,
    paddingTop: spacing.spacer8,
    ...Platform.select(shadows.sm),
  } as const;
  warnIfTabBarHidden(tabBarStyle as any, TabsLayout.name);

  const screenOptions = {
    headerShown: false,
    tabBarHideOnKeyboard: false,
    tabBarShowLabel: true,
    tabBarActiveTintColor: colors.tabBar.active,
    tabBarInactiveTintColor: colors.tabBar.inactive,
    tabBarStyle,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '500',
    },
  } as const;

  return (
    <ErrorBoundary>
      <>
        <Tabs screenOptions={screenOptions}>
          {tabs.map((tab) => {
            const Icon = (Lucide as any)[tab.icon] as React.ComponentType<{ size: number; color: string }>;
            const title = mapTitle(t, tab.title);
            const options = {
              title,
              tabBarIcon: ({ size, color }: { size: number; color: string }) =>
                Icon ? <Icon size={size} color={color} /> : null,
            } as const;
            return <Tabs.Screen key={tab.name} name={tab.name} options={options} />;
          })}
        </Tabs>

        {showCartWidget && <FloatingCartWidget />}
      </>
    </ErrorBoundary>
  );
}

function warnIfTabBarHidden(style: { display?: string } | undefined, ctx: string) {
  if (__DEV__ && style?.display === 'none') {
    console.warn(`[nav] tabBarStyle.display 'none' detected in ${ctx}. This will hide the tab bar.`);
  }
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
