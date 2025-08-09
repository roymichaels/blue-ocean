import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { TonConnectButton } from '@tonconnect/ui-react';
import {
  useTonWallet,
  useTonAddress,
  useTonConnect,
} from '../services/tonAuth';

interface WalletConnectButtonProps {
  onConnect?: () => void;
}

export default function WalletConnectButton({ onConnect }: WalletConnectButtonProps) {
  const wallet = useTonWallet();
  const address = useTonAddress();
  const tonConnectUI = useTonConnect();

  const handleTonConnect = () => {
    onConnect?.();
    tonConnectUI?.openModal();
  };

  const handleMetaMaskConnect = () => {
    onConnect?.();
    alert('MetaMaskConnect coming soon.');
  };

  return (
    <View style={styles.container}>
      <TonConnectButton onClick={handleTonConnect} />
      {wallet && <Text>{address}</Text>}
      <Button title="Connect with MetaMask" onPress={handleMetaMaskConnect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
});
