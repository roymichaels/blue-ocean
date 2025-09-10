import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { Button, Heading, Text } from '@/ui/primitives';
import { Stack } from '@/ui/layout';
import { spacing, typography } from '@/ui/tokens';
import PromoCard from './PromoCard';

export default function HeroCallout() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <PromoCard
      backgroundColor={colors.surface.primary}
      style={{ marginHorizontal: spacing.spacer16, marginBottom: spacing.spacer16 }}
    >
      <Stack
        direction={isWide ? 'horizontal' : 'vertical'}
        gap="spacer16"
        align="center"
        style={{ justifyContent: 'space-between' }}
      >
        <View style={styles.textContainer}>
          <Heading size="lg" style={{ color: colors.text.primary }}>
            {t('home.heroTitle')}
          </Heading>
          <Text
            style={[typography.sm, { color: colors.text.secondary, marginTop: spacing.spacer8 }]}
          >
            {t('home.heroSubtitle')}
          </Text>
        </View>
        <Button title={t('home.heroAction')} />
      </Stack>
    </PromoCard>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    flex: 1,
  },
});

