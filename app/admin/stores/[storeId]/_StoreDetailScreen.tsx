import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '@/components/ui/Button';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import useRequirePlatformAdmin from 'hooks/useRequirePlatformAdmin';
import { useStore } from '@/features/products/hooks';

export default function StoreDetail() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { data: store } = useStore(storeId);
  if (!store) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.label, { color: colors.text.secondary }]}>Name</Text>
      <Text style={[styles.value, { color: colors.text.primary }]}>{store.name}</Text>
      <Text style={[styles.label, { color: colors.text.secondary }]}>Owner</Text>
      <Text style={[styles.value, { color: colors.text.primary }]}>{store.owner}</Text>
      <Button
        title="Impersonate"
        onPress={() => router.push(`/store/${store.id}/admin/dashboard?impersonate=true`)}
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 16, marginBottom: 8 },
});
