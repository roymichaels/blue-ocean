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
import { replace } from '@services/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import storesAgent from '@/agents/stores-agent';
import nearAuth from '../../auth/services/nearAuth';
import { errorLog } from '@/utils/logger';

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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
      Alert.alert(t('common.success'), t('stores.createSuccess'));
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
        Alert.alert(t('stores.transactionCancelled'));
      }
      errorLog('Store mint failed', err);
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
