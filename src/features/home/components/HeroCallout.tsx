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
import PromoCard from './PromoCard';

const SHOP_TENANT_ID = getShopTenantId();

export default function HeroCallout() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const appRouter = useAppRouter();

  const handlePress = () => {
    appRouter.push(`/store/${SHOP_TENANT_ID}`);
  };

  const handleKeyDown = (e: NativeSyntheticEvent<KeyboardEvent>) => {
    const key = e.nativeEvent.key;
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      handlePress();
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
            {t('home.heroTitle')}
          </Heading>
          <Text
            style={[typography.sm, { color: colors.text.secondary, marginTop: spacing.spacer8 }]}
          >
            {t('home.heroSubtitle')}
          </Text>
        </View>
        <Button
          title={t('home.heroAction')}
          onPress={handlePress}
          accessibilityRole="link"
          onKeyDown={handleKeyDown}
          tooltip={t('home.heroAction')}
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

