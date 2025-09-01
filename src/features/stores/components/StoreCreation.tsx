import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  I18nManager,
} from 'react-native';
import storesAgent from '@/agents/stores-agent';
import nearAuth from '@/features/auth/services/nearAuth';
import { errorLog } from '@/utils/logger';

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');

  const mintStore = async () => {
    if (!name) return;
    const owner = nearAuth.getAccountId();
    if (!owner) {
      await nearAuth.signIn();
      return;
    }
    try {
      const id = Date.now().toString();
      await nearAuth.signMessage(`MintStore:${id}`);
      await storesAgent.add({ id, name, owner, nftId: id });
      setName('');
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('insufficient')) {
        Alert.alert('Transaction failed', 'Insufficient funds to deploy the store');
      } else {
        Alert.alert('Transaction cancelled');
      }
      errorLog('Store mint failed', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Store Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Button title="Mint Store" onPress={mintStore} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
});

export default StoreCreation;
