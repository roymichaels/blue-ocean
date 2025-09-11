import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import '../services/chainGuard';
import WalletButton from '../components/WalletButton';
import { isWalletEnabled } from '@/services/config';

export default function RootLayout() {
  const walletEnabled = isWalletEnabled();

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {walletEnabled && <WalletButton />}
    </View>
  );
}
