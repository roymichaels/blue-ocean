// TOUCHPOINT: src/features/home/components/HeroCallout.tsx renders in production — Fix Pack v2
import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type KeyboardEvent,
} from 'react-native';
import { useAppRouter } from '@/services/useAppRouter';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { Button, Heading, Text } from '@/ui/primitives';
import { Stack } from '@/ui/layout';
import { spacing, typography } from '@/ui/tokens';
import { getShopTenantId } from '@/services/config';
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

  const handleKeyDown = (e: NativeSyntheticEvent<KeyboardEvent>) => {
    const key = e.nativeEvent.key;
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <PromoCard
      backgroundColor={colors.surface.primary}
      style={{
        height: isWide ? 112 : 96,
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
            {t('home.hero_subtitle')}
          </Text>
        </View>
        <Button
          title={t('home.hero_action')}
          onPress={action}
          accessibilityRole="link"
          onKeyDown={handleKeyDown}
          tooltip={t('home.hero_action')}
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

