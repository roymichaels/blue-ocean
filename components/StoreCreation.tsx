import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import storesAgent from '../agents/stores-agent';
import tonAuth from '../services/tonAuth';

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');

  const mintStore = async () => {
    if (!name) return;
    const id = Date.now().toString();
    const owner = tonAuth.getAddress() || '';
    await storesAgent.add({ id, name, owner });
    setName('');
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
  label: { fontSize: 16, fontWeight: '600', textAlign: 'right' },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, textAlign: 'right' },
});

export default StoreCreation;
