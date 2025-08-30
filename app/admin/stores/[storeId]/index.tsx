import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../../../contexts/ThemeContext';
import useRequirePlatformAdmin from '../../../../hooks/useRequirePlatformAdmin';
import chain from '../../../../services/chain';
import { Store } from '../../../../types';

let getStore:
  | ((tenantId: string, id: string) => Promise<Store | null>)
  | undefined;
if (chain === 'ton') {
  ({ getStore } = require('../../../../services/tonStores'));
}

export default function StoreDetail() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    if (storeId && getStore) {
      getStore(storeId, storeId).then(setStore).catch(() => {});
    }
  }, [storeId]);

  if (!store) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.label, { color: colors.text.secondary }]}>Name</Text>
      <Text style={[styles.value, { color: colors.text.primary }]}>{store.name}</Text>
      <Text style={[styles.label, { color: colors.text.secondary }]}>Owner</Text>
      <Text style={[styles.value, { color: colors.text.primary }]}>{store.owner}</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.interactive.primary }]}
        onPress={() => router.push(`/store/${store.id}/admin/dashboard?impersonate=true`)}
      >
        <Text style={{ color: colors.text.inverse }}>Impersonate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 16, marginBottom: 8 },
  button: { marginTop: 24, padding: 12, borderRadius: 8, alignItems: 'center' },
});
