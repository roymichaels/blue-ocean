import React, { useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Stack } from '@/ui/layout';
import { spacing } from '@/ui/tokens';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { Store as StoreIcon, Truck } from 'lucide-react-native';
import { useAppRouter } from '@/hooks/useAppRouter';
import { routes } from '@/utils/routes';
import { useAuth } from '@/features/auth/AuthContext';
import { useStores } from '@/hooks/useStores';
import ServiceCard from './ServiceCard';

export default function HomeServices() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const appRouter = useAppRouter();
  const { isAdmin, user } = useAuth();
  const { data: stores = [] } = useStores('default');

  const userAddress = user?.address ?? user?.id ?? null;

  const ownedStores = useMemo(() => {
    if (!userAddress) return [];
    const lower = userAddress.toLowerCase();
    return stores.filter((store) => store.owner?.toLowerCase() === lower);
  }, [stores, userAddress]);

  const shouldShowCreateStore = isAdmin === true && ownedStores.length === 0;

  const handleCreateStore = () => {
    appRouter.push(routes.createStore());
  };

  const handleBecomeDriver = () => {
    Alert.alert(t('profile.comingSoon', 'Coming Soon'));
  };

  return (
    <Stack direction="horizontal" gap="spacer16" style={styles.container}>
      {shouldShowCreateStore ? (
        <ServiceCard
          title={t('cta.create_store')}
          icon={<StoreIcon size={32} color={colors.gold} />}
          onPress={handleCreateStore}
          accessibilityRole="link"
          testID="create-store-link"
        />
      ) : null}
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

