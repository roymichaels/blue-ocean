import React from 'react';
import { StyleSheet } from 'react-native';
import { useLanguage } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import { Button } from '@/ui';

export default function CTABecomeSeller() {
  const { t } = useLanguage();
  const { push } = useAppRouter();

  return (
    <Button
      title={t('home.becomeSeller')}
      onPress={() => push('/stores/create')}
      accessibilityRole="link"
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

