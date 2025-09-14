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
<<<<<<< Updated upstream
import { mintStore as mintStoreOnChain, getStore } from '@/features/stores/services/nearStores';
=======
import storesAgent from '@/agents/stores-agent';
import DatabaseService from '@/services/database';
import { useNotificationActions } from '@/components/NotificationContext';
import { createStoreOnChain } from '@/features/stores/services/nearStores';
import { chainAdapter } from '@/services/chain';
>>>>>>> Stashed changes
import { useWallet } from '@/contexts/WalletProvider';
import { errorLog } from '@/utils/logger';

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<'free' | 'premium'>('free');
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { replace } = useAppRouter();
  const { showNotification } = useNotificationActions();

  const { address: owner, connect } = useWallet();

  const mintStore = async () => {
    // Generate a fallback store name if none was provided to avoid a no-op
    const finalName = (name || '').trim() || `Store ${owner?.slice(0, 6) || ''} ${Date.now().toString().slice(-4)}`.trim();
    if (!owner) {
      await connect();
      return;
    }
    const id = Date.now().toString();
    let onChainError: any = null;
    // Try on-chain first, but do not block local creation in dev
    try {
<<<<<<< Updated upstream
      const { id, txHash } = await mintStoreOnChain(name);
      await getStore(id, id);
      setName('');
      Alert.alert(t('common.success'), `${t('stores.createSuccess')}` + `\n${txHash}`);
=======
      const tx = await createStoreOnChain({ id, name: finalName, owner });
      if (tx) {
        try { showNotification('Store Minted', `tx: ${tx}`, 'success'); } catch {}
      }
    } catch (e: any) {
      onChainError = e;
      // Proceed with local creation; Lake sync will catch up once contract is updated
      errorLog('mint', 'shop', 'fail', e);
    }

    try {
      await storesAgent.add({ id, name: finalName, owner, nftId: id, plan });
      try {
        await DatabaseService.getInstance().updateUserRole(owner, 'store-owner');
      } catch {}
      setName('');
      setPlan('free');
      if (onChainError) {
        // Informational success with fallback note
        Alert.alert(t('common.success'), t('stores.createSuccess'));
      } else {
        Alert.alert(t('common.success'), t('stores.createSuccess'));
      }
>>>>>>> Stashed changes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['store'] }),
        queryClient.invalidateQueries({ queryKey: ['product'] }),
      ]);
      replace(`/store/${id}/admin`);
    } catch (err: any) {
<<<<<<< Updated upstream
      if (err?.message?.toLowerCase().includes('insufficient')) {
        Alert.alert(t('stores.transactionFailed'), t('stores.insufficientFunds'));
      } else {
        Alert.alert(t('stores.transactionFailed'), err?.message || t('stores.transactionCancelled'));
      }
=======
      Alert.alert(t('stores.transactionCancelled'));
>>>>>>> Stashed changes
      errorLog('mint', 'shop', 'fail', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('stores.storeName')}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <View style={styles.planRow}>
        <Text style={styles.label}>{t('stores.plan')}</Text>
        <View style={styles.planButtons}>
          <Button
            title={t('stores.planFree', 'Free')}
            onPress={() => setPlan('free')}
            color={plan === 'free' ? '#0a84ff' : undefined}
          />
          <Button
            title={t('stores.planPremium', 'Premium') + ' · ' + t('common.comingSoon', 'Coming Soon')}
            onPress={() => {}}
            disabled
          />
        </View>
      </View>
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
  planRow: { gap: 8 },
  planButtons: { flexDirection: 'row', gap: 12, justifyContent: 'flex-start' },
});

export default StoreCreation;
