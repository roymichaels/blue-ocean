// TOUCHPOINT: src/features/home/components/HeroCallout.tsx renders in production — Fix Pack v2
import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { Button, Heading, Text } from '@/ui/primitives';
import { Stack } from '@/ui/layout';
import { spacing, typography } from '@/ui/tokens';
import { getShopTenantId } from '@/hooks/config';
import { routes } from '@/utils/routes';
import { useWallet } from '@/contexts/WalletProvider';
import guard from '@/utils/guard';
import PromoCard from './PromoCard';

export default function HeroCallout() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const appRouter = useAppRouter();
  const { address, connect } = useWallet();

  const action = guard(address, connect, () => {
    const shopTenantId = getShopTenantId();
    if (shopTenantId) {
      appRouter.push(`/store/${shopTenantId}`);
    } else {
      appRouter.push(routes.home());
    }
  });

  const handleKeyDown = (e: any) => {
    const key = e?.nativeEvent?.key || e?.key;
    if (key === 'Enter' || key === ' ') {
      e?.preventDefault?.();
      action();
    }
  };

  return (
    <PromoCard
      backgroundColor={colors.surface.primary}
      style={{
        minHeight: isWide ? 112 : 96,
      }}
    >
      <Stack
        direction={isWide ? 'horizontal' : 'vertical'}
        gap="spacer16"
        align="center"
        style={{ justifyContent: 'space-between' }}
      >
        <View style={styles.textContainer}>
          <Heading size="xl" style={{ color: colors.text.primary }}>
            {t('home.hero_title')}
          </Heading>
          <Text
            style={[typography.sm, { color: colors.text.secondary, marginTop: spacing.spacer8 }]}
          >
            {t('home.hero_sub')}
          </Text>
        </View>
        <Button
          title={t('home.shop_now')}
          onPress={action}
          accessibilityRole="link"
          {...(Platform.OS === 'web' ? ({ onKeyDown: handleKeyDown } as any) : {})}
          tooltip={t('home.shop_now')}
        />
      </Stack>
    </PromoCard>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    flex: 1,
  },
});

