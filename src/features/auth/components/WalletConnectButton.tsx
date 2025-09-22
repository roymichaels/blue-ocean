import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from '@/ui';
import { useWallet } from '@/contexts/WalletProvider';

interface WalletConnectButtonProps {
  onConnect?: () => void;
}

export default function WalletConnectButton({ onConnect }: WalletConnectButtonProps) {
  const { address: account, connect } = useWallet();

  useEffect(() => {
    if (account) {
      onConnect?.();
    }
  }, [account, onConnect]);

  const handleConnect = async () => {
    await connect();
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
