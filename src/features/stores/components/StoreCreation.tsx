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
import { useAppRouter } from '@/services';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/ui/ThemeProvider';
import { mintStore as mintStoreOnChain, getStore } from '@/features/stores/services/nearStores';
import { useWallet } from '@/contexts/WalletProvider';
import { errorLog } from '@/utils/logger';

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { replace } = useAppRouter();

  const { address: owner, connect } = useWallet();

  const mintStore = async () => {
    if (!name) return;
    if (!owner) {
      await connect();
      return;
    }
    try {
      const { id, txHash } = await mintStoreOnChain(name);
      await getStore(id, id);
      setName('');
      Alert.alert(t('common.success'), `${t('stores.createSuccess')}` + `\n${txHash}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['store'] }),
        queryClient.invalidateQueries({ queryKey: ['product'] }),
      ]);
      replace('/');
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('insufficient')) {
        Alert.alert(t('stores.transactionFailed'), t('stores.insufficientFunds'));
      } else {
        Alert.alert(t('stores.transactionFailed'), err?.message || t('stores.transactionCancelled'));
      }
      errorLog('mint', 'shop', 'fail', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('stores.storeName')}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Button title={t('stores.mintStore')} onPress={mintStore} />
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
