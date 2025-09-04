import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import chain from '@/services/chain';
import { Order } from '@/types';

let listOrdersBySeller:
  | ((storeId: string, sellerId: string) => Promise<Order[]>)
  | undefined;
if (chain === 'near') {
  ({ listOrdersBySeller } = require('@/services/nearOrders'));
}

interface Props {
  storeId: string;
}

export default function OrderRevenueMetrics({ storeId }: Props) {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!storeId || !listOrdersBySeller) return;
      const list = await listOrdersBySeller(storeId, storeId);
      setOrders(list);
    };
    load();
  }, [storeId]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={[styles.stat, { color: colors.text.primary }]}>Orders: {totalOrders}</Text>
      <Text style={[styles.stat, { color: colors.text.primary }]}>Revenue: {totalRevenue.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end', gap: 4 },
  stat: { fontSize: 16 },
});
