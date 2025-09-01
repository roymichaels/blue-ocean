import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { openModal, useNearAccount, initNear } from '@/services/near';

interface WalletConnectButtonProps {
  onConnect?: () => void;
}

export default function WalletConnectButton({ onConnect }: WalletConnectButtonProps) {
  const account = useNearAccount();

  useEffect(() => {
    if (account) {
      onConnect?.();
    }
  }, [account, onConnect]);

  const handleConnect = async () => {
    const { error } = await initNear();
    if (error) {
      console.error('Wallet initialization failed:', error);
      return;
    }
    openModal();
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
