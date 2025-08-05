import React from 'react';
import { View, Text, Button } from 'react-native';
import { TonConnectButton, useTonWallet, useTonAddress } from '@tonconnect/ui-react';

export default function WalletConnectButton() {
  const wallet = useTonWallet();
  const address = useTonAddress();

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <TonConnectButton />
      {wallet && <Text>{address}</Text>}
      <Button title="Connect with MetaMask" onPress={() => alert('MetaMaskConnect coming soon.')} />
    </View>
  );
}
