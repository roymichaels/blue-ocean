import React from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Stack } from '@/ui/layout';
import { spacing } from '@/ui/tokens';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { Store, Truck } from 'lucide-react-native';
import { useAppRouter } from '@/services/useAppRouter';
import { routes } from '@/utils/routes';
import ServiceCard from './ServiceCard';

export default function HomeServices() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const appRouter = useAppRouter();

  const handleCreateStore = () => {
    appRouter.push(routes.createStore());
  };

  const handleBecomeDriver = () => {
    Alert.alert(t('profile.comingSoon', 'Coming Soon'));
  };

  return (
    <Stack direction="horizontal" gap="spacer16" style={styles.container}>
      <ServiceCard
        icon={<Store size={32} color={colors.gold} />}
        title={t('home.createStore')}
        onPress={handleCreateStore}
        accessibilityRole="link"
        testID="create-store-link"
      />
      <ServiceCard
        icon={<Truck size={32} color={colors.gold} />}
        title={t('home.becomeDriver')}
        onPress={handleBecomeDriver}
        accessibilityRole="button"
        testID="become-driver-button"
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer16,
  },
});

