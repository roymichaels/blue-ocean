import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { initNear } from '../services/near';
import '../services/chainGuard';
import WalletButton from '../components/WalletButton';

export default function RootLayout() {
  const walletEnabled = process.env.EXPO_PUBLIC_FEATURE_WALLET === '1';

  useEffect(() => {
    if (walletEnabled) {
      initNear().catch((e) => {
        console.error('Wallet init failed', e);
      });
    }
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {walletEnabled && <WalletButton />}
    </View>
  );
}
