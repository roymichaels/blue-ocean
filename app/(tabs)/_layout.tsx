import { Tabs } from 'expo-router';
import * as Lucide from 'lucide-react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'expo-router';
import FloatingCartWidget from '../../components/FloatingCartWidget';
import { getTabsForAuth } from '../../config/navigation/tabs';
import { useAuth } from '../../components/AuthContext';

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

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabBar.active,
          tabBarInactiveTintColor: colors.tabBar.inactive,
          tabBarStyle: {
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
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        {tabs.map((tab) => {
          const Icon = (Lucide as any)[tab.icon] as React.ComponentType<{ size: number; color: string }>;
          const title = mapTitle(t, tab.title);
          return (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title,
                tabBarIcon: ({ size, color }) => (Icon ? <Icon size={size} color={color} /> : null),
              }}
            />
          );
        })}
      </Tabs>

      {showCartWidget && <FloatingCartWidget />}
    </>
  );
}

function mapTitle(t: (key: string) => string, raw: string) {
  // Try i18n keys for known items, fall back to raw
  const map: Record<string, string> = {
    Home: t('navigation.home'),
    Categories: t('navigation.categories'),
    Orders: 'הזמנות',
    Notifications: t('navigation.notifications'),
    Profile: t('navigation.profile'),
    Dashboard: 'Dashboard',
    Catalog: 'Catalog',
  };
  return map[raw] ?? raw;
}
