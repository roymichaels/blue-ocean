import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import useRequirePlatformAdmin from '../../../hooks/useRequirePlatformAdmin';
import chain from '../../../services/chain';
import { Store } from '../../../types';

let listStores: (() => Promise<Store[]>) | undefined;
if (chain === 'ton') {
  ({ listStores } = require('../../../services/tonStores'));
}

export default function AdminStores() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (listStores) {
      listStores().then(setStores).catch(() => {});
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {stores.map((s) => (
        <TouchableOpacity
          key={s.id}
          style={[styles.item, { borderColor: colors.border.primary }]}
          onPress={() => router.push(`/admin/stores/${s.id}`)}
        >
          <Text style={{ color: colors.text.primary }}>{s.name || s.id}</Text>
        </TouchableOpacity>
      ))}
      {stores.length === 0 && (
        <Text style={{ color: colors.text.secondary }}>No stores found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  item: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
});
