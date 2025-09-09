import React from 'react';
import { StyleSheet } from 'react-native';
import { useLanguage } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import { Button } from '@/ui';
import { usePathname } from 'expo-router';

export default function CTABecomeSeller() {
  const { t } = useLanguage();
  const { push } = useAppRouter();
  const pathname = usePathname();

  return (
    <Button
      title={t('home.becomeSeller')}
      onPress={() => pathname !== '/stores/create' && push('/stores/create')}
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

