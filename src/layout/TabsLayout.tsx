import { Tabs } from 'expo-router';
import * as Lucide from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'expo-router';
import FloatingCartWidget from '@features/cart/components/FloatingCartWidget';
import { getTabsForAuth } from '@/config/navigation/tabs';
import { useAuth } from '@features/auth/AuthContext';
import ErrorBoundary from '@shared/ErrorBoundary';

export default function TabsLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const auth = useAuth();
  const pathname = usePathname();
  const [showCartWidget, setShowCartWidget] = useState(false);
  const tabs = getTabsForAuth(auth);
  try {
    console.log('[TabsLayout] route:', pathname, 'tabs:', tabs.map((tb) => tb.name));
  } catch {}

  useEffect(() => {
    setShowCartWidget(pathname === '/' || pathname === '/index');
  }, [pathname]);

  const tabBarStyle = {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.tabBar.background,
    borderTopWidth: 1,
    borderTopColor: colors.tabBar.border,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  } as const;
  warnIfTabBarHidden(tabBarStyle as any, 'TabsLayout');

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
    Dashboard: 'Dashboard',
    Catalog: 'Catalog',
  };
  return map[raw] ?? raw;
}
