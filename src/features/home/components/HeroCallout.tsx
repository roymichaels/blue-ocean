import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import { Button, Heading, Text } from '@/ui/primitives';
import { Stack } from '@/ui/layout';
import { spacing, radius, typography, shadows } from '@/ui/tokens';

export default function HeroCallout() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.surface.primary },
        Platform.select(shadows.md),
      ]}
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
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {t('home.heroSubtitle')}
          </Text>
        </View>
        <Button title={t('home.heroAction')} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer24,
    padding: spacing.spacer24,
    borderRadius: radius.lg,
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    ...typography.md,
    marginTop: spacing.spacer8,
  },
});

