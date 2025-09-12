import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Linking,
  type NativeSyntheticEvent,
  type KeyboardEvent,
  Platform,
  View,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  useWindowDimensions,
  type NativeScrollEvent,
} from 'react-native';
import { Card, Text, Button } from '@/ui';
import { Stack } from '@/ui/layout';
import { radius, shadows, spacing } from '@/ui/tokens';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services/useAppRouter';
import { routes } from '@/utils/routes';
import { useWallet } from '@/contexts/WalletProvider';
import { getShopTenantId, getDocsUrl } from '@/services/config';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export default function HomeOptions() {
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

  const scrollRef = useRef<ScrollView>(null);
  const scrollPos = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [showPrev, setShowPrev] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const scrollAmount = 260 + spacing.spacer16;

  useEffect(() => {
    if (!isDesktop && containerWidth && contentWidth) {
      const max = contentWidth - containerWidth;
      setShowPrev(false);
      setShowNext(max > 0);
    }
  }, [containerWidth, contentWidth, isDesktop]);

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

  const handleScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const x = contentOffset.x;
    scrollPos.current = x;
    const max = contentSize.width - layoutMeasurement.width;
    setShowPrev(isRTL ? x < max : x > 0);
    setShowNext(isRTL ? x > 0 : x < max);
  };

  const scrollPrev = () => {
    const newX = isRTL
      ? scrollPos.current + scrollAmount
      : scrollPos.current - scrollAmount;
    scrollRef.current?.scrollTo({ x: newX, animated: true });
  };

  const scrollNext = () => {
    const newX = isRTL
      ? scrollPos.current - scrollAmount
      : scrollPos.current + scrollAmount;
    scrollRef.current?.scrollTo({ x: newX, animated: true });
  };

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

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
    <View
      style={{ position: 'relative' }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        horizontal
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={scrollAmount}
        decelerationRate="fast"
        onContentSizeChange={(w) => setContentWidth(w)}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {options.map(renderCard)}
      </ScrollView>

      {showPrev && (
        <TouchableOpacity
          style={[
            styles.chevron,
            styles.leftChevron,
            { backgroundColor: colors.surface.primary },
          ]}
          onPress={scrollPrev}
          accessibilityRole="button"
        >
          <PrevIcon size={24} color={colors.text.primary} />
        </TouchableOpacity>
      )}

      {showNext && (
        <TouchableOpacity
          style={[
            styles.chevron,
            styles.rightChevron,
            { backgroundColor: colors.surface.primary },
          ]}
          onPress={scrollNext}
          accessibilityRole="button"
        >
          <NextIcon size={24} color={colors.text.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const CARD_WIDTH = 260;
const CARD_HEIGHT = 100;

const styles = StyleSheet.create({
  desktopRow: {
    flexDirection: 'row',
    gap: spacing.spacer16,
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
    height: CARD_HEIGHT,
    justifyContent: 'space-between',
    ...Platform.select(shadows.md),
    ...Platform.select({
      web: { scrollSnapAlign: 'start' as any },
    }),
  },
  cardDesktop: {
    flex: 1,
  },
  cardMobile: {
    width: CARD_WIDTH,
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
  chevron: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftChevron: {
    left: 0,
  },
  rightChevron: {
    right: 0,
  },
});
