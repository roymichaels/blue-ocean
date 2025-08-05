import React from 'react';
import { View, Text, Button } from 'react-native';
import {
  TonConnectButton,
  useTonWallet,
  useTonAddress,
  useTonConnectUI,
} from '@tonconnect/ui-react';

interface WalletConnectButtonProps {
  onConnect?: () => void;
}

export default function WalletConnectButton({ onConnect }: WalletConnectButtonProps) {
  const wallet = useTonWallet();
  const address = useTonAddress();
  const { openModal } = useTonConnectUI();

  const handleTonConnect = () => {
    onConnect?.();
    openModal();
  };

  const handleMetaMaskConnect = () => {
    onConnect?.();
    alert('MetaMaskConnect coming soon.');
  };

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <TonConnectButton onClick={handleTonConnect} />
      {wallet && <Text>{address}</Text>}
      <Button title="Connect with MetaMask" onPress={handleMetaMaskConnect} />
    </View>
  );
}
