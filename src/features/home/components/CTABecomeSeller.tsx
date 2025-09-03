import React from 'react';
import { StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { push } from '@/services/navigation';
import Button from '@/ui/primitives/Button';

export default function CTABecomeSeller() {
  const { t } = useLanguage();

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

