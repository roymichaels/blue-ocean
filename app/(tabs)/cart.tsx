import React from 'react';
import { View, Text } from 'react-native';
import AppShell from '../../components/layout/AppShell';
import { useLanguage } from '@/ui/ThemeProvider';

export default function CartScreen() {
  const { t } = useLanguage();
  return (
    <AppShell showSearch={false}>
      <View>
        <Text>{t('cart.title')}</Text>
      </View>
    </AppShell>
  );
}

