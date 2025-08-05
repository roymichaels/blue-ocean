import React from 'react';
import { View, Text, Button } from 'react-native';
import { useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';

export default function WalletConnectButton() {
  const { openModal } = useTonConnectUI();
  const wallet = useTonWallet();
  const address = useTonAddress();

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      {!wallet ? (
        <Button title="Connect Wallet" onPress={openModal} />
      ) : (
        <Text>{address}</Text>
      )}
      <Button title="Connect with MetaMask" onPress={() => alert('MetaMaskConnect coming soon.')} />
    </View>
  );
}
