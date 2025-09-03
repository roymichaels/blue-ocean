import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { chainAdapter } from '@/services/chain';

interface WalletConnectButtonProps {
  onConnect?: () => void;
}

export default function WalletConnectButton({ onConnect }: WalletConnectButtonProps) {
  const account = chainAdapter.useAccount();

  useEffect(() => {
    if (account) {
      onConnect?.();
    }
  }, [account, onConnect]);

  const handleConnect = async () => {
    const { error } = await chainAdapter.init();
    if (error) {
      console.error('Wallet initialization failed:', error);
      return;
    }
    chainAdapter.openModal();
  };

  return (
    <View style={styles.container}>
      <Button title="Connect NEAR Wallet" onPress={handleConnect} />
      {account && <Text>{account}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
});
