import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, Button } from '@/ui';
import { Stack } from '@/ui/layout';
import { spacing, radius } from '@/ui/tokens';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services/useAppRouter';
import { routes } from '@/utils/routes';
import { useWallet } from '@/contexts/WalletProvider';

export default function HomeOptions() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const appRouter = useAppRouter();
  const { address: walletAddress, connect } = useWallet();

  const handleCreateStore = () => {
    appRouter.push(routes.createStore());
  };

  const handleBecomeDriver = async () => {
    if (!walletAddress) {
      await connect();
      return;
    }
    appRouter.push(routes.driver());
  };

  return (
    <Stack gap="spacer16" style={styles.container}>
      <Card style={styles.card}>
        <Stack gap="spacer8">
          <Text style={[styles.title, { color: colors.text.primary }]}> 
            {t('home.createStore', 'Create a Store')}
          </Text>
          <Button
            title={t('home.createStore', 'Create a Store')}
            onPress={handleCreateStore}
            accessibilityRole="link"
            testID="create-store-link"
          />
        </Stack>
      </Card>
      <Card style={styles.card}>
        <Stack gap="spacer8">
          <Text style={[styles.title, { color: colors.text.primary }]}> 
            {t('home.becomeDriver', 'Become a Driver')}
          </Text>
          <Button
            title={t('home.becomeDriver', 'Become a Driver')}
            onPress={handleBecomeDriver}
            accessibilityRole="link"
            testID="become-driver-button"
          />
        </Stack>
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
    borderRadius: radius.lg,
  },
  title: {
    fontWeight: '600',
  },
});

