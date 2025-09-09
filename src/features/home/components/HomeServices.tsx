import React from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack } from '@/ui/layout';
import { Card, Text } from '@/ui';
import { spacing, radius } from '@/ui/tokens';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { Store, Truck } from 'lucide-react-native';
import { useAppRouter } from '@/services/useAppRouter';
import { routes } from '@/utils/routes';

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
      <Card style={styles.card}>
        <TouchableOpacity
          style={styles.touch}
          onPress={handleCreateStore}
          accessibilityRole="link"
          testID="create-store-link"
        >
          <Stack gap="spacer8" style={styles.content}>
            <Store size={32} color={colors.gold} />
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {t('home.createStore')}
            </Text>
          </Stack>
        </TouchableOpacity>
      </Card>
      <Card style={styles.card}>
        <TouchableOpacity
          style={styles.touch}
          onPress={handleBecomeDriver}
          accessibilityRole="button"
          testID="become-driver-button"
        >
          <Stack gap="spacer8" style={styles.content}>
            <Truck size={32} color={colors.gold} />
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {t('home.becomeDriver')}
            </Text>
          </Stack>
        </TouchableOpacity>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer16,
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
  },
  touch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
  },
});

