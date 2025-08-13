import { Tabs } from 'expo-router';
import {
  ShoppingBag as Home,
  Grid3x3 as Grid3X3,
  Bell,
  User,
  Package,
} from 'lucide-react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'expo-router';
import FloatingCartWidget from '../../components/FloatingCartWidget';

export default function TabLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const pathname = usePathname();
  const [showCartWidget, setShowCartWidget] = useState(false);

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
        <Tabs.Screen
          name="index"
          options={{
            title: t('navigation.home'),
            tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: t('navigation.categories'),
            tabBarIcon: ({ size, color }) => (
              <Grid3X3 size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'הזמנות',
            tabBarIcon: ({ size, color }) => (
              <Package size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: t('navigation.notifications'),
            tabBarIcon: ({ size, color }) => <Bell size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('navigation.profile'),
            tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>

      {showCartWidget && <FloatingCartWidget />}
    </>
  );
}
