import React from 'react';
import { View, Text } from 'react-native';
import AppShell from '../../components/layout/AppShell';
import { useLanguage } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function CartScreen() {
  const { t } = useLanguage();
  return (
    <ErrorBoundary>
      <AppShell showSearch={false}>
        <View>
          <Text>{t('cart.title')}</Text>
        </View>
      </AppShell>
    </ErrorBoundary>
  );
}

