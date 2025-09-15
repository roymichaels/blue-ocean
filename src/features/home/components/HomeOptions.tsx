// TOUCHPOINT: src/features/home/components/HomeOptions.tsx renders in production — Fix Pack v2
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Linking,
  type NativeSyntheticEvent,
  type KeyboardEvent,
  Platform,
  View,
  Pressable,
  I18nManager,
  useWindowDimensions,
} from 'react-native';
import { Card, Text } from '@/ui';
import { Stack } from '@/ui/layout';
import { radius, shadows, spacing } from '@/ui/tokens';
import { Store, Truck, Briefcase, Code2 } from 'lucide-react-native';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services/useAppRouter';
import { routes } from '@/utils/routes';
import { useWallet } from '@/contexts/WalletProvider';
import guard from '@/utils/guard';
import { getShopTenantId, getDocsUrl } from '@/services/config';
import { prefetchStoreBundle } from '@/features/stores/services/prefetch';
import { useStores } from '@/services/useStores';
import InfoModal from '@/components/InfoModal';

function HomeOptions() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const appRouter = useAppRouter();
  const { address: walletAddress, connect } = useWallet();
  const { data: stores = [] } = useStores('default');

  const shopTenantId = getShopTenantId();
  const docsUrl = getDocsUrl();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isRTL = I18nManager.isRTL;
  const gapPx = width >= 768 ? spacing.spacer16 : spacing.spacer12;
  const horizontalPadding = spacing.spacer16;

  const [containerWidth, setContainerWidth] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [prompted, setPrompted] = useState(false);

  // Always render 4 columns; tiles shrink/expand as needed
  const cols = 4;

  const tileSize = useMemo(() => {
    const cw = (containerWidth || width) - horizontalPadding * 2;
    const totalGaps = gapPx * Math.max(0, cols - 1);
    const raw = (cw - totalGaps) / cols;
    // Keep 4 columns by allowing tiles to shrink freely
    return Math.max(1, Math.floor(raw));
  }, [containerWidth, width, gapPx]);

  const onLayoutGrid = useCallback((e: any) => {
    const w = e?.nativeEvent?.layout?.width;
    if (typeof w === 'number' && w > 0) setContainerWidth(w);
  }, []);

  const handleCreateStore = guard(walletAddress, connect, () => {
    appRouter.push(routes.createStore());
  });

  const handleBecomeDriver = guard(walletAddress, connect, () => {
    appRouter.push(routes.driver());
  });

  const handleBusinessLogin = guard(walletAddress, connect, () => {
    if (shopTenantId) void prefetchStoreBundle(shopTenantId);
    appRouter.push(`/store/${shopTenantId}/admin`);
  });

  const handleDocs = () => {
    if (docsUrl) {
      Linking.openURL(docsUrl);
    }
  };

  useEffect(() => {
    if (prompted || !walletAddress) return;
    const ownsStore = stores.some(
      (s) => s.owner?.toLowerCase() === walletAddress.toLowerCase()
    );
    if (!ownsStore) {
      setShowOnboarding(true);
      setPrompted(true);
    }
  }, [walletAddress, stores, prompted]);

  const handleOnboardingClose = () => setShowOnboarding(false);
  const handleOnboardingConfirm = () => {
    setShowOnboarding(false);
    handleCreateStore();
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
      icon: <Store size={24} color={colors.gold} />,
      action: handleCreateStore,
      testID: 'create-store-link',
    },
    {
      key: 'become-driver',
      title: t('home.become_driver', 'Become a Driver'),
      icon: <Truck size={24} color={colors.gold} />,
      action: handleBecomeDriver,
      testID: 'become-driver-button',
    },
    {
      key: 'business-login',
      title: t('home.business_login', 'Business Login'),
      icon: <Briefcase size={24} color={colors.gold} />,
      action: handleBusinessLogin,
      testID: 'business-login-button',
    },
    {
      key: 'docs-api',
      title: t('home.docs_api', 'Docs & API'),
      icon: <Code2 size={24} color={colors.gold} />,
      action: handleDocs,
      tooltip: docsUrl,
      testID: 'docs-api-button',
    },
  ];

  const renderCard = ({ key, title, icon, action, testID }: (typeof options)[number]) => (
    <View key={key} style={{ width: tileSize }}>
      <Card
        style={[
          styles.card,
          // Square tile on desktop: width controlled by parent, height via aspectRatio
          { width: tileSize, height: tileSize },
          isDesktop ? styles.cardDesktop : styles.cardMobile,
        ]}
      >
        <Pressable
          onPress={action}
          onPressIn={() => {
            if (key === 'business-login' && shopTenantId) {
              void prefetchStoreBundle(shopTenantId);
            }
          }}
          {...(Platform.OS === 'web'
            ? ({
                onMouseEnter: () => {
                  if (key === 'business-login' && shopTenantId) {
                    void prefetchStoreBundle(shopTenantId);
                  }
                },
              } as any)
            : {})}
          accessibilityRole="button"
          {...(Platform.OS === 'web' ? ({ onKeyDown: (e: any) => handleKeyDown(e, action) } as any) : {})}
          style={({ pressed }) => [styles.tilePressable, { padding: spacing.spacer12 }, pressed && styles.pressed]}
          testID={testID}
        >
          <Stack gap="spacer8" style={styles.tileContent}>
            {icon}
            <Text style={[styles.title, { color: colors.text.primary, textAlign: 'center', fontSize: 14 }]}>{title}</Text>
          </Stack>
        </Pressable>
      </Card>
    </View>
  );

  return (
    <>
      <InfoModal
        visible={showOnboarding}
        title={t('home.create_store_prompt_title', 'Create your store')}
        message={
          t(
            'home.create_store_prompt_message',
            'You have no store yet. Create one to start selling.'
          )
        }
        buttonText={t('home.create_store_prompt_action', 'Create Store')}
        onClose={handleOnboardingClose}
        onConfirm={handleOnboardingConfirm}
        autoClose={false}
      />
      <View
        onLayout={onLayoutGrid}
        style={[
          styles.desktopRow,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            flexWrap: 'wrap',
            gap: gapPx,
            paddingHorizontal: horizontalPadding,
            // Keep content clear of the sticky bottom tab bar but minimize scroll
            paddingBottom: 72,
          },
        ]}
      >
        {options.map(renderCard)}
      </View>
    </>
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
  card: {
    borderRadius: radius.xl,
    justifyContent: 'center',
    ...Platform.select(shadows.md),
    ...Platform.select({
      web: { scrollSnapAlign: 'start' as any },
    }),
  },
  cardDesktop: {},
  cardMobile: {},
  title: {
    fontWeight: '600',
  },
  tilePressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spacer16,
  },
  tileContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9 },
});

