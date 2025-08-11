import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import TonWeb from 'tonweb';
import { Buffer } from 'buffer';
import storesAgent from '../agents/stores-agent';
import tonAuth from '../services/tonAuth';
import codeBoc from '../contracts/store-nft-code.boc';
import dataBoc from '../contracts/store-nft-data.boc';

const provider = new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC');

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');

  const deployStoreNFT = async () => {
    const code = TonWeb.boc.Cell.fromBoc(Buffer.from(codeBoc, 'base64'))[0];
    const data = TonWeb.boc.Cell.fromBoc(Buffer.from(dataBoc, 'base64'))[0];
    const contract = new (TonWeb as any).Contract(provider, { code, data });
    const init = await contract.createStateInit();
    const stateInitBoc = TonWeb.utils.bytesToBase64(await init.stateInit.toBoc({ idx: false }));
    const address = (await contract.getAddress()).toString(true, true, true);
    try {
      await (tonAuth as any).tonConnectUI?.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address,
            amount: TonWeb.utils.toNano('0.05').toString(),
            stateInit: stateInitBoc,
          },
        ],
      });
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes('insufficient')) {
        Alert.alert('Transaction failed', 'Insufficient funds to deploy the store');
      } else {
        // user rejection or other error
        Alert.alert('Transaction cancelled');
      }
      throw e;
    }
    return address as string;
  };

  const mintStore = async () => {
    if (!name) return;
    const owner = tonAuth.getAddress();
    if (!owner) {
      await tonAuth.openModal();
      return;
    }
    try {
      const nftId = await deployStoreNFT();
      const id = Date.now().toString();
      await storesAgent.add({ id, name, owner, nftId });
      setName('');
    } catch {
      // Deployment failed or was rejected
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
  label: { fontSize: 16, fontWeight: '600', textAlign: 'right' },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, textAlign: 'right' },
});

export default StoreCreation;
