import React from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useLanguage } from '@/ui/ThemeProvider';
import { spacing } from '@/ui/tokens';
import { Store, Truck } from 'lucide-react-native';
import { useAppRouter } from '@/services/useAppRouter';
import { routes } from '@/utils/routes';
import ServiceCard from './ServiceCard';

interface ServiceItem {
  key: string;
  title: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  onPress: () => void;
  accessibilityRole: 'button' | 'link';
  testID: string;
  subtitle?: string;
}

export default function HomeServices() {
  const { t } = useLanguage();
  const appRouter = useAppRouter();

  const handleCreateStore = () => {
    appRouter.push(routes.createStore());
  };

  const handleBecomeDriver = () => {
    Alert.alert(t('profile.comingSoon', 'Coming Soon'));
  };

  const services: ServiceItem[] = [
    {
      key: 'createStore',
      title: t('home.createStore'),
      Icon: Store,
      onPress: handleCreateStore,
      accessibilityRole: 'link',
      testID: 'create-store-link',
    },
    {
      key: 'becomeDriver',
      title: t('home.becomeDriver'),
      Icon: Truck,
      onPress: handleBecomeDriver,
      accessibilityRole: 'button',
      testID: 'become-driver-button',
    },
  ];

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={services}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => (
        <ServiceCard
          title={item.title}
          Icon={item.Icon}
          onPress={item.onPress}
          accessibilityRole={item.accessibilityRole}
          testID={item.testID}
          subtitle={item.subtitle}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ width: spacing.spacer16 }} />}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer16,
  },
});

