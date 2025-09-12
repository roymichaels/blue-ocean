// TOUCHPOINT: src/features/home/components/HomeOptions.tsx — editing per “Kill wallet CTA + horizontal premium cards”
import React from 'react';
import {
  StyleSheet,
  Linking,
  type NativeSyntheticEvent,
  type KeyboardEvent,
  Platform,
  View,
  ScrollView,
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
import { getShopTenantId, getDocsUrl } from '@/services/config';

function HomeOptions() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const appRouter = useAppRouter();
  const { address: walletAddress, connect } = useWallet();

  const SHOP_TENANT_ID = getShopTenantId();
  const DOCS_URL = getDocsUrl();
  const walletTooltip = t(
    'home.connectWalletToContinue',
    'חבר ארנק כדי להמשיך',
  );

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isRTL = I18nManager.isRTL;
  const cardHeight = isDesktop ? 112 : 96;
  const actionsLabel = t('home.actions', 'Actions');

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

  const options = [
    {
      key: 'create-store',
      title: t('home.createStore', 'Create a Store'),
      action: handleCreateStore,
      tooltip: walletAddress ? undefined : walletTooltip,
      testID: 'create-store-link',
      disabled: !walletAddress,
    },
    {
      key: 'become-driver',
      title: t('home.becomeDriver', 'Become a Driver'),
      action: handleBecomeDriver,
      tooltip: walletAddress ? undefined : walletTooltip,
      testID: 'become-driver-button',
      disabled: !walletAddress,
    },
    {
      key: 'business-login',
      title: t('home.businessLogin', 'Business Login'),
      action: handleBusinessLogin,
      tooltip: walletAddress ? undefined : walletTooltip,
      testID: 'business-login-button',
      disabled: !walletAddress,
    },
    {
      key: 'docs-api',
      title: t('home.docsApi', 'Docs & API'),
      action: handleDocs,
      tooltip: DOCS_URL,
      testID: 'docs-api-button',
      disabled: false,
    },
  ];

  const renderCard = ({
    key,
    title,
    action,
    tooltip,
    testID,
    disabled,
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
          style={[styles.fullWidth, disabled && styles.disabled]}
          testID={testID}
        />
      </Stack>
    </Card>
  );

  if (isDesktop) {
    return (
      <View
        aria-label={actionsLabel}
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={actionsLabel}
      contentContainerStyle={[
        styles.scrollContent,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      style={styles.scroll}
    >
      {options.map(renderCard)}
    </ScrollView>
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
  scroll: {
    ...Platform.select({
      web: { scrollSnapType: 'x mandatory' as any },
    }),
  },
  scrollContent: {
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
  disabled: {
    opacity: 0.5,
  },
});

// Home cards now render 4 wide on md: and horizontal snap scroll on mobile. No vertical stack on desktop.
// All Home CTAs interact (Enter/Space) and navigate; disabled shows tooltip 'חבר ארנק כדי להמשיך'.

