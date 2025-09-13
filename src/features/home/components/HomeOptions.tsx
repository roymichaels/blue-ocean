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
import { ScrollView } from 'react-native';
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
  const horizontalPadding = spacing.spacer16;
  const gapPx = spacing.spacer16;
  const desktopCols = width >= 1280 ? 4 : width >= 1024 ? 3 : 4; // prefer 4 at md per spec
  const desktopItemWidth = isDesktop
    ? Math.max(160, (width - horizontalPadding * 2 - gapPx * (desktopCols - 1)) / desktopCols)
    : 260;

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

  const handleKeyDown = (e: any, action: () => void) => {
    const key = e?.nativeEvent?.key || e?.key;
    if (key === 'Enter' || key === ' ') {
      e?.preventDefault?.();
      action();
    }
  };

  const gateTip = t('home.connectWalletToContinue', 'חבר ארנק כדי להמשיך');

  const options = [
    {
      key: 'create-store',
      title: t('home.create_store', 'Create a Store'),
      action: handleCreateStore,
      testID: 'create-store-link',
    },
    {
      key: 'become-driver',
      title: t('home.become_driver', 'Become a Driver'),
      action: handleBecomeDriver,
      testID: 'become-driver-button',
    },
    {
      key: 'business-login',
      title: t('home.business_login', 'Business Login'),
      action: handleBusinessLogin,
      testID: 'business-login-button',
    },
    {
      key: 'docs-api',
      title: t('home.docs_api', 'Docs & API'),
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
    <View key={key} style={[isDesktop ? { width: desktopItemWidth } : null]}>
      <Card
        style={[
          styles.card,
          { height: cardHeight, width: isDesktop ? '100%' : desktopItemWidth },
          isDesktop ? styles.cardDesktop : styles.cardMobile,
        ]}
      >
        <Stack gap="spacer8">
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          <Button
            title={title}
            onPress={action}
            {...(Platform.OS === 'web' ? ({ onKeyDown: (e: any) => handleKeyDown(e, action) } as any) : {})}
            accessibilityRole="link"
            tooltip={tooltip ?? (!walletAddress ? gateTip : undefined)}
            style={styles.fullWidth}
            testID={testID}
          />
        </Stack>
      </Card>
    </View>
  );

  if (isDesktop) {
    return (
      <View
        style={[
          styles.desktopRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {options.map(renderCard)}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToAlignment="start"
      snapToInterval={desktopItemWidth + gapPx}
      contentContainerStyle={styles.mobileRow}
    >
      {options.map(renderCard)}
    </ScrollView>
  );
}

export default HomeOptions; // DOCME: premium action cards

const styles = StyleSheet.create({
  desktopRow: {
    paddingHorizontal: spacing.spacer16,
    gap: spacing.spacer16,
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  mobileRow: {
    paddingHorizontal: spacing.spacer16,
    gap: spacing.spacer16,
    alignItems: 'stretch',
  },
  card: {
    borderRadius: radius.xl,
    justifyContent: 'space-between',
    ...Platform.select(shadows.md),
    ...Platform.select({
      web: { scrollSnapAlign: 'start' as any },
    }),
  },
  cardDesktop: {},
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

