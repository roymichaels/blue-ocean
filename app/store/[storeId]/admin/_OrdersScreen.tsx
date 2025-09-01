import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { debugLog } from '@/utils/logger';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../contexts/ThemeContext';
import chain from '../../../../services/chain';
import { Order } from '../../../../types';
import { useAccountId } from '@/features/auth/services/nearAuth';

let listOrdersBySeller:
  | ((storeId: string, sellerId: string) => Promise<Order[]>)
  | undefined;
if (chain === 'near') {
  ({ listOrdersBySeller } = require('../../../../services/tonOrders'));
}

export default function StoreOrdersScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { colors } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const address = useAccountId();

  const handlePress = (order: Order) => {
    debugLog('Pressed order', order.id);
  };

  const handleLongPress = (order: Order) => {
    debugLog('Long pressed order', order.id);
  };

  useEffect(() => {
    const load = async () => {
      if (!storeId || address !== storeId || !listOrdersBySeller) return;
      const all = await listOrdersBySeller(storeId, storeId);
      setOrders(all);
    };
    load();
  }, [storeId, address]);

  if (address !== storeId) {
    return (
      <View
        style={[
          styles.container,
          styles.content,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: colors.text.primary }}>יש להתחבר לארנק המתאים</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      data={orders}
      keyExtractor={(order) => order.id}
      renderItem={({ item: o }) => (
        <TouchableOpacity
          style={[styles.orderItem, { borderColor: colors.border.primary }]}
          onPress={() => handlePress(o)}
          onLongPress={() => handleLongPress(o)}
        >
          <Text style={{ color: colors.text.primary }}>#{o.id}</Text>
          <Text style={{ color: colors.text.primary }}>{o.status}</Text>
          <Text style={{ color: colors.text.primary }}>{o.total}</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>אין הזמנות</Text>
      }
      ListHeaderComponent={
        <Text style={[styles.title, { color: colors.text.primary }]}>הזמנות</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'end' },
  orderItem: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 },
});

