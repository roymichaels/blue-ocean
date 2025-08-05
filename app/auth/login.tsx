import React from 'react';
import { View, StyleSheet } from 'react-native';
import WalletConnectButton from '../../components/WalletConnectButton';

export default function AuthLoginScreen() {
  return (
    <View style={styles.container}>
      <WalletConnectButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
