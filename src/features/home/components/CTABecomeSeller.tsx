import React from 'react';
import { StyleSheet } from 'react-native';
import { useLanguage } from '@/ui/ThemeProvider';
import { Button } from '@/ui';

interface Props {
  onPress?: () => void;
}

export default function CTABecomeSeller({ onPress }: Props) {
  const { t } = useLanguage();

  return (
    <Button
      title={t('home.becomeSeller')}
      onPress={onPress}
      accessibilityRole="button"
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});

