import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, Button } from '@/ui';
import { Stack } from '@/ui/layout';
import { spacing, radius } from '@/ui/tokens';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';

interface HomeOptionsProps {
  onCreateStore?: () => void;
  onBecomeDriver?: () => void;
}

export default function HomeOptions({ onCreateStore, onBecomeDriver }: HomeOptionsProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <Stack gap="spacer16" style={styles.container}>
      <Card style={styles.card}>
        <Stack gap="spacer8">
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('home.createStore', 'Create a Store')}
          </Text>
          <Button title={t('home.createStore', 'Create a Store')} onPress={onCreateStore} />
        </Stack>
      </Card>
      <Card style={styles.card}>
        <Stack gap="spacer8">
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('home.becomeDriver', 'Become a Driver')}
          </Text>
          <Button title={t('home.becomeDriver', 'Become a Driver')} onPress={onBecomeDriver} />
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer16,
  },
  card: {
    borderRadius: radius.lg,
  },
  title: {
    fontWeight: '600',
  },
});

