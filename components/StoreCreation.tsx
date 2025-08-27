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
import TonWeb from 'tonweb';
import { Buffer } from 'buffer';
import storesAgent from '../agents/stores-agent';
import nearAuth from '../services/nearAuth';
import codeBoc from '../contracts/store-nft-code.boc';
import dataBoc from '../contracts/store-nft-data.boc';
import { getTonWeb } from '../services/tonProvider';
import { errorLog } from '../utils/logger';

const tonweb = getTonWeb();

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');

  const deployStoreNFT = async () => {
    const code = TonWeb.boc.Cell.fromBoc(Buffer.from(codeBoc, 'base64'))[0];
    const data = TonWeb.boc.Cell.fromBoc(Buffer.from(dataBoc, 'base64'))[0];
    const contract = new TonWeb.Contract(tonweb.provider, { code, data });
    const init = await contract.createStateInit();
    const stateInitBoc = TonWeb.utils.bytesToBase64(
      await init.stateInit.toBoc(false),
    );
    const address = (await contract.getAddress()).toString(true, true, true);
    try {
      await nearAuth.signMessage(Buffer.from(stateInitBoc));
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
    const owner = nearAuth.getAccountId();
    if (!owner) {
      await nearAuth.signIn();
      return;
    }
    try {
      const nftId = await deployStoreNFT();
      const id = Date.now().toString();
      await storesAgent.add({ id, name, owner, nftId });
      setName('');
    } catch (err) {
      errorLog('Store mint failed', err);
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
