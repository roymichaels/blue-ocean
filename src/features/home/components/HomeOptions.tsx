import React from 'react';
import {
  StyleSheet,
  Linking,
  type NativeSyntheticEvent,
  type KeyboardEvent,
  Platform,
} from 'react-native';
import { Card, Text, Button } from '@/ui';
import { Stack } from '@/ui/layout';
import { spacing, radius, shadows } from '@/ui/tokens';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services/useAppRouter';
import { routes } from '@/utils/routes';
import { useWallet } from '@/contexts/WalletProvider';
import { getShopTenantId, getDocsUrl } from '@/services/config';

export default function HomeOptions() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const appRouter = useAppRouter();
  const { address: walletAddress, connect } = useWallet();

  const SHOP_TENANT_ID = getShopTenantId();
  const DOCS_URL = getDocsUrl();
  const walletTooltip = t(
    'home.connectWalletToContinue',
    'Connect wallet to continue',
  );

  const handleCreateStore = async () => {
    if (!walletAddress) {
      await connect();
      return;
    }
    appRouter.push(routes.createStore());
  };

  const handleBecomeDriver = async () => {
    if (!walletAddress) {
      await connect();
      return;
    }
    appRouter.push(routes.driver());
  };

  const handleBusinessLogin = async () => {
    if (!walletAddress) {
      await connect();
      return;
    }
    appRouter.push(`/store/${SHOP_TENANT_ID}/admin`);
  };

  const handleDocs = () => {
    if (DOCS_URL) {
      Linking.openURL(DOCS_URL);
    }
  };

  const handleKeyDown = (
    e: NativeSyntheticEvent<KeyboardEvent>,
    action: () => void,
  ) => {
    const key = e.nativeEvent.key;
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      action();
    }
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
            onKeyDown={(e) => handleKeyDown(e, handleCreateStore)}
            accessibilityRole="link"
            tooltip={walletAddress ? undefined : walletTooltip}
            disabled={!walletAddress}
            style={styles.fullWidth}
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
            onKeyDown={(e) => handleKeyDown(e, handleBecomeDriver)}
            accessibilityRole="link"
            tooltip={walletAddress ? undefined : walletTooltip}
            disabled={!walletAddress}
            style={styles.fullWidth}
            testID="become-driver-button"
          />
        </Stack>
      </Card>

      <Card style={styles.card}>
        <Stack gap="spacer8">
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('home.businessLogin', 'Business Login')}
          </Text>
          <Button
            title={t('home.businessLogin', 'Business Login')}
            onPress={handleBusinessLogin}
            onKeyDown={(e) => handleKeyDown(e, handleBusinessLogin)}
            accessibilityRole="link"
            tooltip={walletAddress ? undefined : walletTooltip}
            disabled={!walletAddress}
            style={styles.fullWidth}
            testID="business-login-button"
          />
        </Stack>
      </Card>

      <Card style={styles.card}>
        <Stack gap="spacer8">
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('home.docsApi', 'Docs & API')}
          </Text>
          <Button
            title={t('home.docsApi', 'Docs & API')}
            onPress={handleDocs}
            onKeyDown={(e) => handleKeyDown(e, handleDocs)}
            accessibilityRole="link"
            tooltip={DOCS_URL}
            style={styles.fullWidth}
            testID="docs-api-button"
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
    borderRadius: radius.xl,
    ...Platform.select(shadows.md),
  },
  title: {
    fontWeight: '600',
  },
  fullWidth: {
    width: '100%',
  },
});
