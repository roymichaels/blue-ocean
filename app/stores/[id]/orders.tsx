import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { listOrdersBySeller } from '../../../services/tonOrders';
import { Order } from '../../../types';
import { useTonAddress } from '../../../services/tonAuth';

export default function StoreOrdersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const address = useTonAddress();

  useEffect(() => {
    const load = async () => {
      if (!id || address !== id) return;
      const all = await listOrdersBySeller(id);
      setOrders(all);
    };
    load();
  }, [id, address]);

  if (address !== id) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: colors.text.primary }}>יש להתחבר לארנק המתאים</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>הזמנות</Text>
      {orders.map((o) => (
        <View key={o.id} style={[styles.orderItem, { borderColor: colors.border.primary }]}>
          <Text style={{ color: colors.text.primary }}>#{o.id}</Text>
          <Text style={{ color: colors.text.primary }}>{o.status}</Text>
          <Text style={{ color: colors.text.primary }}>{o.total}</Text>
        </View>
      ))}
      {orders.length === 0 && (
        <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>אין הזמנות</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'right' },
  orderItem: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 },
});

