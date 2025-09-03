import React from 'react';
import { View, Text } from 'react-native';
import AppShell from '../../components/layout/AppShell';

export default function CartScreen() {
  return (
    <AppShell showSearch={false}>
      <View>
        <Text>Cart Screen</Text>
      </View>
    </AppShell>
  );
}

