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
        title={t('cta.create_store')}
        icon={<Store size={32} color={colors.gold} />}
        onPress={handleCreateStore}
        accessibilityRole="link"
        testID="create-store-link"
      />
      <ServiceCard
        title={t('cta.become_driver')}
        icon={<Truck size={32} color={colors.gold} />}
        onPress={handleBecomeDriver}
        accessibilityRole="button"
        testID="become-driver-button"
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer16,
  },
});

