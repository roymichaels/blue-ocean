import React from 'react';
import { View, Text } from 'react-native';
import AppShell from '../../components/layout/AppShell';
import ErrorBoundary from '@shared/ErrorBoundary';

export default function CartScreen() {
  return (
    <ErrorBoundary>
      <AppShell showSearch={false}>
        <View>
          <Text>Cart Screen</Text>
        </View>
      </AppShell>
    </ErrorBoundary>
  );
}

