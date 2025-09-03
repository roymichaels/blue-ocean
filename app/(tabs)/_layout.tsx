import { Tabs } from 'expo-router';
import * as Lucide from 'lucide-react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'expo-router';
import FloatingCartWidget from '@/features/cart/components/FloatingCartWidget';
import { getTabsForAuth } from '../../config/navigation/tabs';
import { useAuth } from '@/features/auth/AuthContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function TabLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const auth = useAuth();
  const pathname = usePathname();
  const [showCartWidget, setShowCartWidget] = useState(false);
  const tabs = getTabsForAuth(auth);
  try {
    // Debug: ensure tabs are being computed and route is visible in console
    // This helps diagnose blank screens in web when tabs render nothing
    // eslint-disable-next-line no-console
    console.log('[TabLayout] route:', pathname, 'tabs:', tabs.map((t) => t.name));
  } catch {}

  useEffect(() => {
    // Only show cart widget on the homepage
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
  warnIfTabBarHidden(tabBarStyle, 'TabLayout');

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
              tabBarIcon: ({ size, color }) => (Icon ? <Icon size={size} color={color} /> : null),
            } as const;
            warnIfTabBarHidden(options.tabBarStyle, `tab ${tab.name}`);
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
    // eslint-disable-next-line no-console
    console.warn(`[nav] tabBarStyle.display 'none' detected in ${ctx}. This will hide the tab bar.`);
  }
}

function mapTitle(t: (key: string) => string, raw: string) {
  // Try i18n keys for known items, fall back to raw
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
