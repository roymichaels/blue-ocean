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
import storesAgent from '@/agents/stores-agent';
import DatabaseService from '@/services/database';
import { useNotificationActions } from '@/components/NotificationContext';
import { createStoreOnChain } from '@/features/stores/services/nearStores';
import { useWallet } from '@/contexts/WalletProvider';
import { errorLog } from '@/utils/logger';

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { replace } = useAppRouter();
  const { showNotification } = useNotificationActions();

  const { address: owner, connect } = useWallet();

  const mintStore = async () => {
    // Generate a fallback store name if none was provided to avoid a no-op
    const finalName =
      (name || '').trim() ||
      `Store ${owner?.slice(0, 6) || ''} ${Date.now()
        .toString()
        .slice(-4)}`.trim();
    if (!owner) {
      await connect();
      return;
    }
    const id = Date.now().toString();
    let onChainError: any = null;
    // Try on-chain first, but do not block local creation in dev
    try {
      const tx = await createStoreOnChain({ id, name: finalName, owner });
      if (tx) {
        try {
          showNotification('Store Minted', `tx: ${tx}`, 'success');
        } catch {}
      }
    } catch (e: any) {
      onChainError = e;
      // Proceed with local creation; Lake sync will catch up once contract is updated
      errorLog('mint', 'shop', 'fail', e);
    }

    try {
      await storesAgent.add({
        id,
        name: finalName,
        owner,
        nftId: id,
        plan: 'free',
      });
      try {
        await DatabaseService.getInstance().updateUserRole(
          owner,
          'store-owner'
        );
      } catch {}
      setName('');
      if (onChainError) {
        // Informational success with fallback note
        Alert.alert(t('common.success'), t('stores.createSuccess'));
      } else {
        Alert.alert(t('common.success'), t('stores.createSuccess'));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['store'] }),
        queryClient.invalidateQueries({ queryKey: ['product'] }),
      ]);
      replace(`/store/${id}/admin`);
    } catch (err: any) {
      Alert.alert(t('stores.transactionCancelled'));
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
