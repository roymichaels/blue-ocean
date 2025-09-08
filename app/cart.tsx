import React from 'react';
import { View, Text } from 'react-native';
import { useLanguage } from '@/ui/ThemeProvider';

export default function CartScreen() {
  const { t } = useLanguage();
  return (
    <View>
      <Text>{t('cart.title')}</Text>
    </View>
  );
}

