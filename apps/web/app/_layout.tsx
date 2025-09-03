import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { chainAdapter } from '@services/chain';
import '../services/chainGuard';
import WalletButton from '../components/WalletButton';

export default function RootLayout() {
  const walletEnabled = process.env.EXPO_PUBLIC_FEATURE_WALLET === '1';

  useEffect(() => {
    if (walletEnabled) {
      chainAdapter.init().catch((e) => {
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
