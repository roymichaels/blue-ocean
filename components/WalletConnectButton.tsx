import React, { useEffect, useMemo } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { TonConnectButton } from '@tonconnect/ui-react';
import {
  useTonWallet,
  useTonAddress,
  useTonConnect,
} from '../services/tonAuth';
import validateTonAddress from '../utils/validateTonAddress';
import { errorLog } from '../utils/logger';

interface WalletConnectButtonProps {
  onConnect?: () => void;
}

export default function WalletConnectButton({ onConnect }: WalletConnectButtonProps) {
  const wallet = useTonWallet();
  const address = useTonAddress();
  const tonConnectUI = useTonConnect();
  const validAddress = useMemo(() => validateTonAddress(address), [address]);

  useEffect(() => {
    if (wallet) {
      if (!validAddress) {
        errorLog('Invalid TON address received');
      } else {
        onConnect?.();
      }
    }
  }, [wallet, validAddress, onConnect]);

  const handleTonConnect = () => {
    tonConnectUI?.openModal();
  };

  const handleMetaMaskConnect = () => {
    onConnect?.();
    alert('MetaMaskConnect coming soon.');
  };

  return (
    <View style={styles.container}>
      <TonConnectButton onClick={handleTonConnect} />
      {wallet && validAddress && <Text>{address}</Text>}
      {wallet && !validAddress && <Text style={{ color: 'red' }}>Invalid address</Text>}
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
