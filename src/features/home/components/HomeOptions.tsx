// TOUCHPOINT: src/features/home/components/HomeOptions.tsx renders in production — Fix Pack v2
import React from 'react';
import {
  StyleSheet,
  Linking,
  type NativeSyntheticEvent,
  type KeyboardEvent,
  Platform,
  View,
  I18nManager,
  useWindowDimensions,
} from 'react-native';
import { Card, Text, Button } from '@/ui';
import { Stack } from '@/ui/layout';
import { radius, shadows, spacing } from '@/ui/tokens';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services/useAppRouter';
import { routes } from '@/utils/routes';
import { useWallet } from '@/contexts/WalletProvider';
import guard from '@/utils/guard';
import { getShopTenantId, getDocsUrl } from '@/services/config';

function HomeOptions() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const appRouter = useAppRouter();
  const { address: walletAddress, connect } = useWallet();

  const shopTenantId = getShopTenantId();
  const docsUrl = getDocsUrl();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isRTL = I18nManager.isRTL;
  const cardHeight = isDesktop ? 112 : 96;

  const handleCreateStore = guard(walletAddress, connect, () => {
    appRouter.push(routes.createStore());
  });

  const handleBecomeDriver = guard(walletAddress, connect, () => {
    appRouter.push(routes.driver());
  });

  const handleBusinessLogin = guard(walletAddress, connect, () => {
    appRouter.push(`/store/${shopTenantId}/admin`);
  });

  const handleDocs = () => {
    if (docsUrl) {
      Linking.openURL(docsUrl);
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

  const options = [
    {
      key: 'create-store',
      title: t('cta.create_store', 'Create a Store'),
      action: handleCreateStore,
      testID: 'create-store-link',
    },
    {
      key: 'become-driver',
      title: t('cta.become_driver', 'Become a Driver'),
      action: handleBecomeDriver,
      testID: 'become-driver-button',
    },
    {
      key: 'business-login',
      title: t('cta.business_login', 'Business Login'),
      action: handleBusinessLogin,
      testID: 'business-login-button',
    },
    {
      key: 'docs-api',
      title: t('cta.docs_api', 'Docs & API'),
      action: handleDocs,
      tooltip: docsUrl,
      testID: 'docs-api-button',
    },
  ];

  const renderCard = ({
    key,
    title,
    action,
    tooltip,
    testID,
  }: (typeof options)[number]) => (
    <Card
      key={key}
      style={[
        styles.card,
        { height: cardHeight },
        isDesktop ? styles.cardDesktop : styles.cardMobile,
      ]}
    >
      <Stack gap="spacer8">
        <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        <Button
          title={title}
          onPress={action}
          onKeyDown={(e) => handleKeyDown(e, action)}
          accessibilityRole="link"
          tooltip={tooltip}
          style={styles.fullWidth}
          testID={testID}
        />
      </Stack>
    </Card>
  );

  if (isDesktop) {
    return (
      <View
        style={[
          styles.desktopGrid,
          { direction: isRTL ? 'rtl' : 'ltr' },
        ]}
      >
        {options.map(renderCard)}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.mobileRow,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      {options.map(renderCard)}
    </View>
  );
}

export default HomeOptions; // DOCME: premium action cards

const styles = StyleSheet.create({
  desktopGrid: {
    display: 'grid',
    gap: spacing.spacer16,
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    paddingHorizontal: spacing.spacer16,
  },
  mobileRow: {
    paddingHorizontal: spacing.spacer16,
    gap: spacing.spacer16,
  },
  card: {
    borderRadius: radius.xl,
    justifyContent: 'space-between',
    ...Platform.select(shadows.md),
    ...Platform.select({
      web: { scrollSnapAlign: 'start' as any },
    }),
  },
  cardDesktop: {
    width: '100%',
  },
  cardMobile: {
    width: 260,
  },
  title: {
    fontWeight: '600',
  },
  fullWidth: {
    width: '100%',
  },
});

