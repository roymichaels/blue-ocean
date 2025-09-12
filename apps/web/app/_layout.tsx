import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import '../services/chainGuard';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
