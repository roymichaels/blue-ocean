import React, { Suspense, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AppProviders from '@/application/providers/AppProviders';
import { ErrorBoundary } from '@/application/error/ErrorBoundary';
import { useAppMode } from '@/application/providers/AppModeProvider';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { TabBarIcon } from '@/ui/components/TabBarIcon';
import { Screen } from '@/ui/layout/Screen';
import { Skeleton } from '@/ui/components/Skeleton';

type TabKey = 'home' | 'search' | 'messages' | 'orders' | 'profile';

type TabIconName = React.ComponentProps<typeof TabBarIcon>['name'];

interface TabConfig {
  key: TabKey;
  label: string;
  icon: TabIconName;
  component: React.ComponentType;
}

function createLazyScreen<T extends Record<string, unknown> = Record<string, never>>(
  loader: () => Promise<{ default: React.ComponentType<T> }>,
) {
  const LazyComponent = React.lazy(loader);
  return (props: T) => (
    <Suspense
      fallback={
        <Screen scrollable>
          <Skeleton height={220} />
        </Screen>
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
}

const tabs: TabConfig[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    component: createLazyScreen(() => import('@/ui/screens/HomeScreen')),
  },
  {
    key: 'search',
    label: 'Search',
    icon: 'search',
    component: createLazyScreen(() => import('@/ui/screens/SearchScreen')),
  },
  {
    key: 'messages',
    label: 'Messages',
    icon: 'message-square',
    component: createLazyScreen(() => import('@/ui/screens/MessagesScreen')),
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: 'shopping-bag',
    component: createLazyScreen(() => import('@/ui/screens/OrdersScreen')),
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'user',
    component: createLazyScreen(() => import('@/ui/screens/ProfileScreen')),
  },
];

function AppContent() {
  const { colors, spacing } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const active = useMemo(() => tabs.find((tab) => tab.key === activeTab) ?? tabs[0], [activeTab]);
  const ActiveComponent = active.component;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.content}>
        <ActiveComponent />
      </View>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Platform.select({ ios: spacing.sm, android: spacing.xs, default: spacing.xs }),
          },
        ]}
      >
        {tabs.map((tab) => {
          const focused = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.tabButton,
                { paddingVertical: spacing.xs, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <TabBarIcon name={tab.icon} focused={focused} />
              <Text
                style={{
                  marginTop: 4,
                  color: focused ? colors.primary : colors.textMuted,
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: Platform.select({ web: 'inherit', default: undefined }),
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AppHost() {
  const { hydrated } = useAppMode();
  const { colors } = useTheme();

  if (!hydrated) {
    return (
      <View style={[styles.loadingState, { backgroundColor: colors.background }]}> 
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <AppContent />;
}

export default function App() {
  return (
    <View style={styles.container}>
      <AppProviders>
        <ErrorBoundary>
          <AppHost />
        </ErrorBoundary>
      </AppProviders>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
